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

const responseSchema = z.object({
  records: z.array(CrmRecordSchema),
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
    const stripped = norm.mobile_without_country_code.replace(/[^\d+]/g, '');
    const digitCount = (stripped.match(/\d/g) || []).length;
    if (digitCount < 5) {
      norm.mobile_without_country_code = null;
    } else {
      norm.mobile_without_country_code = stripped;
    }
  }

  return norm as CrmRecord;
}

export async function processBatch(
  headers: string[], 
  rows: Record<string, string>[],
  provider: 'groq' | 'gemini' = 'groq'
) {
  let attempt = 0;
  const maxRetries = config.AI_MAX_RETRIES;
  const startTime = Date.now();

  const prompt = `You are an expert data extraction AI. You receive CSV headers and row data as JSON.
Your job: map each row to a standardized CRM schema and return a JSON object with a "records" array.

RULES:
- Use semantic understanding to figure out which column maps to which CRM field.
- Never invent data. If a value is not present in the source, leave the field null.
- If a row has BOTH email and phone missing, still include it but set all fields to null (it will be filtered as a skip).
- If multiple emails exist, use the first as "email" and append the rest to "crm_note".
- If multiple phone numbers exist, use the first as "mobile_without_country_code" and append the rest to "crm_note".
- "crm_status" MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — or null.
- "data_source" MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — or null.
- OUT-OF-SYLLABUS DATA: If a row is completely irrelevant to CRM leads (e.g., a list of products, pokemon, cars, random nonsense), DO NOT hallucinate data. Return null for all fields (which will mark it as skipped).
- IMPORTANT: DO NOT LOSE ANY DATA for actual leads. If a valid lead row contains columns (like Campaign, Ad Set, extra IDs, etc) that do not map to standard CRM fields, you MUST append all of that extra unmapped data into the "crm_note" field.
- Combine first name + last name into a single "name" field.
- Strip formatting from phone numbers (spaces, dashes, parentheses).
- Output \`created_at\` in strict ISO-8601 format (YYYY-MM-DDTHH:mm:ssZ) so it is parseable by JavaScript's new Date(). If no date is present, use null.
- You MUST return exactly ${rows.length} objects in the "records" array — one per input row.
- Output ONLY valid JSON. No markdown, no explanation.

JSON Schema:
${JSON.stringify(zodToJsonSchema(responseSchema as any))}

Example:
Headers: ["First Name", "SurName", "Email Address", "Phone", "Org"]
Row: [{"First Name": "John", "SurName": "Doe", "Email Address": "john@acme.com", "Phone": "555-0198", "Org": "Acme Corp"}]
Output: {"records": [{"name": "John Doe", "email": "john@acme.com", "mobile_without_country_code": "5550198", "company": "Acme Corp"}]}

---
CSV Headers: ${JSON.stringify(headers)}
Row Data:
${JSON.stringify(rows)}`;

  while (attempt < maxRetries) {
    let usedGroqIndex = currentGroqIndex;
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length, provider }, 'Sending batch to AI');

      let records: CrmRecord[] = [];

      if (process.env.NODE_ENV === 'test') {
        records = await MockAIProvider.extract(headers, rows);
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
        const validated = responseSchema.safeParse(parsed);
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
          model: 'llama-3.3-70b-versatile',
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

        const validated = responseSchema.safeParse(parsed);
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

      for (const record of records) {
        const normalized = normalizeAndValidate(record);
        
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
          if (usedGroqIndex === currentGroqIndex && currentGroqIndex < groqClients.length - 1) {
            logger.warn(`Groq key ${currentGroqIndex} exhausted. Rotating to key ${currentGroqIndex + 1}...`);
            currentGroqIndex++;
            attempt = 0;
            continue;
          } else if (usedGroqIndex < currentGroqIndex) {
            // Another worker already rotated the key! Just retry with the new key.
            logger.warn(`Another worker rotated Groq key to ${currentGroqIndex}. Retrying with new key...`);
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
