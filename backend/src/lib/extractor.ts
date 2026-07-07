import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { CrmRecord, CrmRecordSchema } from '../validation/schema';
import logger from '../utils/logger';
import { config } from '../config';
import { MockAIProvider } from './MockAIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

let groqClients: Groq[] = [];
let currentGroqIndex = 0;
let genAI: GoogleGenerativeAI | null = null;

function getGroqClient() {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing.');
  }
  if (groqClients.length === 0) {
    const keys = config.GROQ_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid GROQ API keys found.');
    groqClients = keys.map(key => new Groq({ apiKey: key }));
  }
  return groqClients[currentGroqIndex];
}

function getGeminiClient() {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing.');
  }
  if (!genAI) genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  return genAI;
}



const LlmRecordSchema = CrmRecordSchema.omit({ 
  email: true, 
  mobile_without_country_code: true, 
  created_at: true,
  country_code: true 
});

const llmResponseSchema = z.object({
  records: z.array(LlmRecordSchema),
});

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    const lastFence = trimmed.lastIndexOf('```');
    if (lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim();
    }
  }
  return trimmed;
}

function salvageParsedJson(parsed: any): any {
  if (Array.isArray(parsed)) {
    parsed = { records: parsed };
  }

  if (parsed && Array.isArray(parsed.records)) {
    for (const record of parsed.records) {
      if (typeof record === 'object' && record !== null) {
        for (const key of Object.keys(record)) {
          if (record[key] === '') {
            record[key] = null;
          }
        }
        
        const validStatus = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
        if (record.crm_status && !validStatus.includes(record.crm_status)) {
          record.crm_status = null;
        }
        
        const validSource = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
        if (record.data_source && !validSource.includes(record.data_source)) {
          record.data_source = null;
        }
      }
    }
  }
  return parsed;
}

function normalizeAndValidate(record: any): CrmRecord {
  const norm = { ...record };

  // 1. Whitespace Normalization
  for (const key of Object.keys(norm)) {
    if (typeof norm[key] === 'string') {
      norm[key] = norm[key].trim();
      if (norm[key] === '') norm[key] = null;
    }
  }

  // 2. Email Validation
  if (norm.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(norm.email)) {
      norm.email = null;
    }
  }

  // 3. Phone Validation
  if (norm.mobile_without_country_code) {
    let phoneStr = String(norm.mobile_without_country_code).trim();
    
    // Fix scientific notation if it slipped through (e.g. 9.19876e+11 -> 919876000000)
    if (/^\d+\.?\d*e\+\d+$/i.test(phoneStr)) {
      try {
        phoneStr = BigInt(Math.round(Number(phoneStr))).toString();
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Extract country code if present (e.g. +91 9876543210 or +1 (555))
    const countryMatch = phoneStr.match(/^(\+\d{1,4})\s*(.*)$/);
    if (countryMatch) {
      if (!norm.country_code) {
        norm.country_code = countryMatch[1];
      }
      phoneStr = countryMatch[2];
    }
    
    // Strip all non-digits from the mobile
    const stripped = phoneStr.replace(/[^\d]/g, '');
    const digitCount = stripped.length;
    if (digitCount < 5) {
      norm.mobile_without_country_code = null;
    } else {
      norm.mobile_without_country_code = stripped;
    }
  }



  return norm as CrmRecord;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_FORMAT_REGEX = /^[\s\d()+-]{7,30}$/;
const PHONE_EMBEDDED_REGEX = /(?:\+?\d{1,4}[\s.-]*)?\(?\d{2,4}\)?[\s.-]*\d{3,4}[\s.-]*\d{4}/;
const DATE_FORMAT_REGEX = /\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/](?:19|20)\d{2}\b/;
const DIGIT_REGEX = /\d/g;

export async function processBatch(
  headers: string[], 
  rows: Record<string, string>[],
  provider: 'groq' | 'gemini' = 'groq'
) {
  let attempt = 0;
  let keysTried = 1;
  const maxRetries = config.AI_MAX_RETRIES;
  const startTime = Date.now();

  interface ExtractedData {
    original: Record<string, string>;
    sanitized: Record<string, string>;
    email: string | null;
    mobile_without_country_code: string | null;
    created_at: string | null;
  }

  const extractedData: ExtractedData[] = rows.map(row => {
    const sanitized = { ...row };
    let email: string | null = null;
    let mobile_without_country_code: string | null = null;
    let created_at: string | null = null;

    for (const key of Object.keys(sanitized)) {
      let value = sanitized[key];
      if (!value) continue;

      if (!email) {
        const match = value.match(EMAIL_REGEX);
        if (match) {
          email = match[0];
          value = value.replace(match[0], '').trim();
        }
      }

      if (!created_at) {
        const match = value.match(DATE_FORMAT_REGEX);
        if (match) {
          const d = new Date(match[0]);
          if (!isNaN(d.getTime())) {
            created_at = d.toISOString();
            value = value.replace(match[0], '').trim();
          }
        }
      }

      if (!mobile_without_country_code && value.length > 0) {
        const digitCount = (value.match(DIGIT_REGEX) || []).length;
        if (digitCount >= 7) {
          // If the value is purely a phone number format
          if (PHONE_FORMAT_REGEX.test(value)) {
            mobile_without_country_code = value.trim();
            value = '';
          } else {
            // Try to extract a standard phone number embedded in text
            const match = value.match(PHONE_EMBEDDED_REGEX);
            if (match) {
              mobile_without_country_code = match[0];
              value = value.replace(match[0], '').trim();
            }
          }
        }
      }

      if (value === '') {
        delete sanitized[key];
      } else {
        sanitized[key] = value;
      }
    }

    return { original: row, sanitized, email, mobile_without_country_code, created_at };
  });

  const sanitizedRows = extractedData.map(d => d.sanitized);

  const prompt = `You are a strict data extraction engine. You receive CSV headers and row data as JSON.
Your job is purely to map the provided semantic data into the defined CRM schema.

CRITICAL RULES:
- You are NOT allowed to rewrite values.
- You are NOT allowed to improve values.
- You are NOT allowed to generate realistic replacements or fake names.
- Every name, company, city, state, country, and note MUST be copied EXACTLY from the source row.
- Never fabricate information. Treat this as an information extraction task, NOT a text generation task.
- If a value is not explicitly present in the source, leave the field null.
- "crm_status" MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — or null.
- "data_source" MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — or null.
- If a row is completely irrelevant nonsense, DO NOT hallucinate data. Return null for all fields.
- DO NOT LOSE ANY DATA. If a valid lead row contains columns (like Campaign, Ad Set, extra IDs, etc) that do not map to standard CRM fields, you MUST append all of that extra unmapped data into the "crm_note" field.
- Combine first name + last name into a single "name" field ONLY if they exist. Do not invent a name if it's not there.
- You MUST return exactly ${sanitizedRows.length} objects in the "records" array — one per input row.
- Output ONLY valid JSON matching the schema. No markdown, no explanation.

JSON Schema:
${JSON.stringify(zodToJsonSchema(llmResponseSchema as any))}

Example:
Headers: ["First Name", "SurName", "Org"]
Row: [{"First Name": "John", "SurName": "Doe", "Org": "Acme Corp"}]
Output: {"records": [{"name": "John Doe", "company": "Acme Corp"}]}

---
CSV Headers: ${JSON.stringify(headers)}
Row Data:
${JSON.stringify(sanitizedRows)}`;

  while (attempt < maxRetries) {
    const usedGroqIndex = currentGroqIndex;
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length, provider }, 'Sending batch to AI');

      let records: any[] = [];

      if (process.env.NODE_ENV === 'test') {
        records = await MockAIProvider.extract(headers, sanitizedRows);
      } else if (provider === 'gemini') {
        const ai = getGeminiClient();
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        });
        const content = result.response.text();
        if (!content) throw new Error('Empty response from Gemini');
        let parsed;
        try {
          parsed = JSON.parse(stripMarkdownFences(content));
        } catch (e) {
          logger.error({ content: stripMarkdownFences(content) }, 'Failed to parse JSON from Gemini');
          throw e;
        }
        
        parsed = salvageParsedJson(parsed);
        if (parsed?.records && Array.isArray(parsed.records) && parsed.records.length !== sanitizedRows.length) {
          throw new Error(`AI returned ${parsed.records.length} records, expected ${sanitizedRows.length}`);
        }

        const validated = llmResponseSchema.safeParse(parsed);
        if (!validated.success) {
          logger.error({ errors: validated.error.format() }, 'Zod validation failed on Gemini output');
          throw new Error('AI output did not match expected schema');
        }
        records = validated.data.records;
      } else {
        const client = getGroqClient();
        const completion = await client.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.'
            },
            { role: 'user', content: prompt }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq');

        const cleaned = stripMarkdownFences(content);
        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          logger.error({ content: cleaned }, 'Failed to parse JSON from AI');
          throw e;
        }

        parsed = salvageParsedJson(parsed);
        if (parsed?.records && Array.isArray(parsed.records) && parsed.records.length !== sanitizedRows.length) {
          throw new Error(`AI returned ${parsed.records.length} records, expected ${sanitizedRows.length}`);
        }

        const validated = llmResponseSchema.safeParse(parsed);
        if (!validated.success) {
          logger.error({ errors: validated.error.format() }, 'Zod validation failed on AI output');
          throw new Error('AI output did not match expected schema');
        }
        records = validated.data.records;
      }

      let skippedCount = 0;
      const skippedReasons: Record<string, number> = {};

      if (records.length < rows.length) {
        const truncatedCount = rows.length - records.length;
        logger.warn(`Row count mismatch: expected ${rows.length}, got ${records.length}. Tracking missing as skipped.`);
        skippedCount += truncatedCount;
        skippedReasons['AI Truncated Output (Missing Rows)'] = truncatedCount;
      }

      const validRecords: CrmRecord[] = [];

      for (let i = 0; i < records.length; i++) {
        // Merge the deterministic extraction with the LLM mapping
        const mergedRecord = {
          ...records[i],
          email: extractedData[i].email,
          mobile_without_country_code: extractedData[i].mobile_without_country_code,
          created_at: extractedData[i].created_at
        };

        const normalized = normalizeAndValidate(mergedRecord);
        
        const hasContact = normalized.email || normalized.mobile_without_country_code;
        
        // Check for mostly empty records (only name exists)
        let meaningfulData = false;
        for (const [key, value] of Object.entries(normalized)) {
          if (key !== 'name' && value !== null && value !== undefined) {
            meaningfulData = true;
            break;
          }
        }

        if (!hasContact) {
          skippedCount++;
          skippedReasons['AI Rejected (Missing Valid Contact Info)'] = (skippedReasons['AI Rejected (Missing Valid Contact Info)'] || 0) + 1;
        } else if (!meaningfulData) {
          skippedCount++;
          skippedReasons['AI Rejected (Lacks Meaningful Data)'] = (skippedReasons['AI Rejected (Lacks Meaningful Data)'] || 0) + 1;
        } else {
          validRecords.push(normalized);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info({
        batchSize: rows.length,
        extracted: validRecords.length,
        skipped: skippedCount,
        ms: processingTimeMs
      }, 'Batch complete');

      return { records: validRecords, skippedCount, skippedReasons, processingTimeMs };

    } catch (error: any) {
      attempt++;

      const status = error?.status || error?.response?.status || (error.message?.includes('429') ? 429 : 500);
      const isRateLimit = status === 429;
      
      // If we hit a rate limit, try to rotate key first if using groq
      if (isRateLimit) {
        if (provider === 'groq') {
          if (keysTried < groqClients.length) {
            if (usedGroqIndex === currentGroqIndex) {
              currentGroqIndex = (currentGroqIndex + 1) % groqClients.length;
              logger.warn(`Groq key exhausted. Rotating to key ${currentGroqIndex}...`);
            } else {
              logger.warn(`Another worker rotated Groq key to ${currentGroqIndex}. Retrying with new key...`);
            }
            keysTried++;
            attempt = 0;
            continue;
          }
        }
        
        const limitError = new Error('Rate limit exceeded');
        (limitError as any).status = 429;
        (limitError as any).exhaustedProvider = provider;
        throw limitError;
      }

      const isTransientError = status >= 500;

      if (!isTransientError && !(error instanceof SyntaxError)) {
        logger.error({ err: error.message, status }, 'Non-retriable error');
        throw error;
      }

      if (attempt >= maxRetries) {
        logger.error({ err: error.message, attempts: attempt }, 'Max retries exhausted');
        throw error;
      }

      const baseDelay = isRateLimit ? config.AI_RETRY_DELAY_MS * 1.5 : config.AI_RETRY_DELAY_MS;
      const delayMs = (baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 1000;

      logger.warn({ attempt, delayMs: Math.round(delayMs), err: error.message }, 'Retrying after delay');
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Failed to process batch after retries');
}
