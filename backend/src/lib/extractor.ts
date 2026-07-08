import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { CrmRecord, CrmRecordSchema } from '../validation/schema';
import logger from '../utils/logger';
import { config } from '../config';
import { MockAIProvider } from './MockAIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { stripMarkdownFences, salvageExtractorJson, VALID_CRM_STATUSES, VALID_DATA_SOURCES } from '../utils/ai-utils';

let groqClients: Groq[] = [];
let currentGroqIndex = 0;
let availableGroqIndices: number[] = [];
let genAI: GoogleGenerativeAI | null = null;

export function getGroqClient(): { client: Groq, index: number } {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing.');
  }
  if (groqClients.length === 0) {
    const keys = config.GROQ_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid GROQ API keys found.');
    groqClients = keys.map(key => new Groq({ apiKey: key }));
    availableGroqIndices = groqClients.map((_, i) => i);
  }
  
  if (availableGroqIndices.length === 0) {
    throw new Error('All Groq keys are exhausted.');
  }

  // Round-robin selection for load balancing
  currentGroqIndex = (currentGroqIndex + 1) % availableGroqIndices.length;
  const selectedIndex = availableGroqIndices[currentGroqIndex];
  
  return { client: groqClients[selectedIndex], index: selectedIndex };
}

export function markGroqKeyExhausted(index: number) {
  if (!availableGroqIndices.includes(index)) return; // Already exhausted
  availableGroqIndices = availableGroqIndices.filter(i => i !== index);
  logger.warn(`Groq key at index ${index} marked as exhausted. ${availableGroqIndices.length} keys remaining. Will restore in 60s.`);
  
  // TTL-based recovery: Rate limits typically reset after a minute.
  setTimeout(() => {
    if (!availableGroqIndices.includes(index)) {
      availableGroqIndices.push(index);
      logger.info(`Groq key at index ${index} restored after 60s timeout. ${availableGroqIndices.length} keys available.`);
    }
  }, 60000);
}

export function getGeminiClient() {
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

// stripMarkdownFences and salvageExtractorJson are imported from '../utils/ai-utils'
// to avoid code duplication with mapper.ts

function normalizeAndValidate(record: any): CrmRecord {
  const norm = { ...record };

  // 1. Whitespace & NaN Normalization
  for (const key of Object.keys(norm)) {
    if (typeof norm[key] === 'string') {
      const val = norm[key].trim();
      const lower = val.toLowerCase();
      if (val === '' || lower === 'nan' || lower === 'null') {
        norm[key] = null;
      } else {
        norm[key] = val;
      }
    }
  }

  // 1b. Enum Enforcement (to handle deterministic mapping bypassing Zod)
  if (norm.crm_status && !VALID_CRM_STATUSES.includes(norm.crm_status as any)) {
    norm.crm_status = null;
  }
  if (norm.data_source && !VALID_DATA_SOURCES.includes(norm.data_source as any)) {
    const lower = String(norm.data_source).toLowerCase();
    const matched = VALID_DATA_SOURCES.find(ds => lower.includes(ds.toLowerCase()));
    if (matched) {
       norm.data_source = matched;
    } else {
       norm.data_source = null;
    }
  }

  // 2. Email Validation
  if (norm.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(norm.email)) {
      norm.email = null;
    }
  }

  // 2b. Country Code Validation
  if (norm.country_code) {
    let cc = String(norm.country_code).trim();
    if (cc.endsWith('.0')) cc = cc.replace('.0', '');
    if (!cc.startsWith('+')) cc = '+' + cc;
    norm.country_code = cc;
  }

  // 3. Phone Validation
  if (norm.mobile_without_country_code) {
    let phoneStr = String(norm.mobile_without_country_code).trim();
    
    // Fix scientific notation if it slipped through (e.g. 9.19876e+11 -> 919876000000)
    if (/^\d+\.?\d*e[+-]?\d+$/i.test(phoneStr)) {
      try {
        // Use Number() to convert scientific string, then format as fixed string without exponent
        phoneStr = BigInt(Math.round(Number(phoneStr))).toString();
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Extract extension before stripping non-digits
    const extMatch = phoneStr.match(/(?:ext|x|extension)\.?\s*(\d{1,5})/i);
    if (extMatch) {
      const ext = extMatch[1];
      phoneStr = phoneStr.replace(extMatch[0], '').trim();
      if (ext) {
         norm.crm_note = norm.crm_note ? `${norm.crm_note} | Extension: ${ext}` : `Extension: ${ext}`;
      }
    }
    
    // Extract country code if present (e.g. +91 9876543210 or 91-95446-3201)
    let countryMatch = phoneStr.match(/^(\+\d{1,4})[\s-]*(.*)$/);
    if (!countryMatch) {
      // Check for 1-2 digit country code with a separator, avoiding 3-digit US area codes
      countryMatch = phoneStr.match(/^(\d{1,2})[\s-]+(\d[\d\s-]{4,})$/);
    }
    if (!countryMatch) {
      // Highly optimize for unformatted numbers (e.g. 919624444730 -> +91 9624444730)
      const pureDigits = phoneStr.replace(/[^\d]/g, '');
      if (pureDigits.length === 12 && pureDigits.startsWith('91')) {
        countryMatch = [phoneStr, '91', pureDigits.slice(2)]; // India (91 + 10 digits)
      } else if (pureDigits.length === 12 && pureDigits.startsWith('44')) {
        countryMatch = [phoneStr, '44', pureDigits.slice(2)]; // UK (44 + 10 digits)
      } else if (pureDigits.length === 11 && pureDigits.startsWith('1')) {
        countryMatch = [phoneStr, '1', pureDigits.slice(1)]; // US/CA (1 + 10 digits)
      } else if (pureDigits.length === 11 && pureDigits.startsWith('61')) {
        countryMatch = [phoneStr, '61', pureDigits.slice(2)]; // Australia (61 + 9 digits)
      }
    }
    if (countryMatch) {
      if (!norm.country_code) {
        norm.country_code = countryMatch[1].startsWith('+') ? countryMatch[1] : '+' + countryMatch[1];
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
  // 4. Infer Country from Country Code
  if (norm.country_code && !norm.country) {
    if (norm.country_code === '+1') norm.country = 'United States';
    else if (norm.country_code === '+44') norm.country = 'United Kingdom';
    else if (norm.country_code === '+91') norm.country = 'India';
    else if (norm.country_code === '+61') norm.country = 'Australia';
    else if (norm.country_code === '+49') norm.country = 'Germany';
    else if (norm.country_code === '+33') norm.country = 'France';
    else if (norm.country_code === '+81') norm.country = 'Japan';
    else if (norm.country_code === '+86') norm.country = 'China';
    else if (norm.country_code === '+55') norm.country = 'Brazil';
    else if (norm.country_code === '+52') norm.country = 'Mexico';
  }

  return norm as CrmRecord;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_FORMAT_REGEX = /^[\s\d()+-]{7,30}$/;
const PHONE_EMBEDDED_REGEX = /(?:\+?\d{1,4}[\s.-]*)?\(?\d{2,4}\)?(?:[\s.-]*\d{2,6}){1,4}(?:\s*(?:ext|x|extension)\.?\s*\d{1,5})?/i;
const DATE_FORMAT_REGEX = /\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}\b/;
const TEXT_DATE_REGEX = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*|\s+)(?:19|20)\d{2}\b/i;
const DIGIT_REGEX = /\d/g;

function resolveRelativeDate(str: string): number | null {
  const lower = str.trim().toLowerCase();
  const now = new Date();
  if (lower === 'today') return now.getTime();
  if (lower === 'yesterday') return now.getTime() - 86400000;
  if (lower === 'tomorrow') return now.getTime() + 86400000;
  return null;
}

let circuitBreakerOpenUntil = 0;

export async function processBatch(
  headers: string[], 
  rows: Record<string, string>[],
  provider: 'groq' | 'gemini' = 'groq',
  schemaMapping?: { source: string, target?: string | null, confidence?: any }[] | null
) {
  let attempt = 0;
  let keysTried = 1;
  const maxRetries = config.AI_MAX_RETRIES;
  const startTime = Date.now();

  if (provider === 'groq' && Date.now() < circuitBreakerOpenUntil) {
    const limitError = new Error('API Key exhausted or restricted (Circuit Breaker Open)');
    (limitError as any).status = 429;
    (limitError as any).exhaustedProvider = 'groq';
    throw limitError;
  }

  interface ExtractedData {
    original: Record<string, string>;
    sanitized: Record<string, string>;
    email: string | null;
    mobile_without_country_code: string | null;
    created_at: string | null;
    needsAI: boolean;
    _row_id?: string;
  }

  const extractedData: ExtractedData[] = rows.map(row => {
    const { _row_id, ...rowWithoutId } = row;
    const sanitized = { ...rowWithoutId };
    
    let email: string | null = null;
    let mobile_without_country_code: string | null = null;
    let created_at: string | null = null;

    for (const key of Object.keys(sanitized)) {
      if (/created|enquiry|added|submitted|timestamp|lead date/i.test(key)) {
        let value = sanitized[key];
        if (!value) continue;
        
        const relative = resolveRelativeDate(value);
        if (relative) {
          created_at = new Date(relative).toISOString();
          delete sanitized[key];
          break;
        }

        let dateMatch = value.match(DATE_FORMAT_REGEX) || value.match(TEXT_DATE_REGEX);
        if (dateMatch) {
          const parsedDate = Date.parse(dateMatch[0].replace(/\./g, '-'));
          if (!isNaN(parsedDate)) {
            created_at = new Date(parsedDate).toISOString();
            sanitized[key] = value.replace(dateMatch[0], '').trim();
            if (!sanitized[key]) delete sanitized[key];
            break;
          }
        }
      }
    }

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

      if (!created_at && !/appointment|meeting|event|end|follow|birth|dob/i.test(key)) {
        const relative = resolveRelativeDate(value);
        if (relative) {
          created_at = new Date(relative).toISOString();
          value = '';
        } else {
          let dateMatch = value.match(DATE_FORMAT_REGEX) || value.match(TEXT_DATE_REGEX);
          if (dateMatch) {
            const parsedDate = Date.parse(dateMatch[0].replace(/\./g, '-'));
            if (!isNaN(parsedDate)) {
              created_at = new Date(parsedDate).toISOString();
              value = value.replace(dateMatch[0], '').trim();
            }
          }
        }
      }

      if (!mobile_without_country_code && value.length > 0) {
        const isDateColumn = /date|time|created|updated|added/i.test(key);
        const isPureDate = DATE_FORMAT_REGEX.test(value);
        
        if (!isDateColumn && !isPureDate) {
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
      }

      if (value === '') {
        delete sanitized[key];
      } else {
        sanitized[key] = value;
      }
    }
    const needsAI = Object.keys(sanitized).length > 0;
    
    return { original: row, sanitized, email, mobile_without_country_code, created_at, needsAI, _row_id: _row_id as string | undefined };
  });

  const aiRows = extractedData.filter(d => d.needsAI).map(d => d.sanitized);

  if (schemaMapping && schemaMapping.length > 0) {
    const validRecords: CrmRecord[] = [];
    let skippedCount = 0;
    const skippedReasons: Record<string, number> = {};
    const skippedRecords: any[] = [];

    for (let i = 0; i < extractedData.length; i++) {
      const d = extractedData[i];
      const { original, email, mobile_without_country_code, created_at, _row_id } = d;
      
      const record: any = { 
        email, mobile_without_country_code, created_at, _row_id 
      };

      const mappedKeys = new Set<string>();
      const extraNotes: string[] = [];

      for (const map of schemaMapping) {
        const conf = Number(map.confidence);
        if (!isNaN(conf) && conf < 70) continue;
        if (!map.target) continue;
        
        const val = original[map.source];
        if (val && val.trim() !== '') {
          // Guard: don't overwrite cleanly auto-extracted fields with dirty mapped data
          if (['email', 'mobile_without_country_code', 'created_at'].includes(map.target) && record[map.target]) {
            mappedKeys.add(map.source);
          } else {
            record[map.target] = val.trim();
            mappedKeys.add(map.source);
          }
        }
      }

      if (!record.name && record.email) {
        const parts = record.email.split('@')[0].split(/[._-]/);
        if (parts.length > 0) {
           record.name = parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        }
      }

      if (record.crm_status) {
         const s = record.crm_status.toLowerCase();
         if (s.includes('interested') || s.includes('call back') || s.includes('follow up') || s.includes('positive') || s.includes('callback')) {
            record.crm_status = 'GOOD_LEAD_FOLLOW_UP';
         } else if (s.includes('not connected') || s.includes('did not connect') || s.includes('no answer')) {
            record.crm_status = 'DID_NOT_CONNECT';
         } else if (s.includes('bad') || s.includes('not interested') || s.includes('dnc') || s.includes('do not call')) {
            record.crm_status = 'BAD_LEAD';
         } else if (s.includes('sale') || s.includes('done') || s.includes('closed') || s.includes('won')) {
            record.crm_status = 'SALE_DONE';
         } else {
            record.crm_status = null;
         }
      }

      for (const [key, val] of Object.entries(original)) {
        if (key === '_row_id' || mappedKeys.has(key)) continue;
        if (!val || val.trim() === '') continue;

        const valTrimmed = val.trim();
        const keyLower = key.toLowerCase();

        if (valTrimmed.includes('@') && EMAIL_REGEX.test(valTrimmed)) {
           extraNotes.push(`Additional email: ${valTrimmed}`);
        } else if ((valTrimmed.match(DIGIT_REGEX) || []).length >= 7 && (PHONE_FORMAT_REGEX.test(valTrimmed) || PHONE_EMBEDDED_REGEX.test(valTrimmed))) {
           extraNotes.push(`Additional phone: ${valTrimmed}`);
        } else if (keyLower.includes('note') || keyLower.includes('remark') || keyLower.includes('comment') || keyLower.includes('feedback')) {
           extraNotes.push(`${key}: ${valTrimmed}`);
        }
      }

      if (extraNotes.length > 0) {
         record.crm_note = record.crm_note ? record.crm_note + ' | ' + extraNotes.join(' | ') : extraNotes.join(' | ');
      }

      const normalized = normalizeAndValidate(record);
      
      const hasContact = normalized.email || normalized.mobile_without_country_code;
      const AUTO_FIELDS = new Set(['name', 'email', 'mobile_without_country_code', 'created_at', 'country_code', '_row_id']);
      let meaningfulData = false;
      for (const [key, value] of Object.entries(normalized)) {
        if (!AUTO_FIELDS.has(key) && value !== null && value !== undefined) {
          meaningfulData = true;
          break;
        }
      }

      if (!hasContact) {
        skippedCount++;
        skippedReasons['Rejected (Missing Valid Contact Info)'] = (skippedReasons['Rejected (Missing Valid Contact Info)'] || 0) + 1;
        skippedRecords.push({ original, reason: 'Rejected (Missing Valid Contact Info)' });
      } else if (!meaningfulData) {
        skippedCount++;
        skippedReasons['Rejected (Lacks Meaningful Data)'] = (skippedReasons['Rejected (Lacks Meaningful Data)'] || 0) + 1;
        skippedRecords.push({ original, reason: 'Rejected (Lacks Meaningful Data)' });
      } else {
        validRecords.push(normalized);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    logger.info({ batchSize: rows.length, extracted: validRecords.length, skipped: skippedCount, ms: processingTimeMs }, 'Deterministic batch complete');
    return { records: validRecords, skippedCount, skippedReasons, skippedRecords, processingTimeMs };
  }

  const prompt = `You are a strict data extraction engine. You receive CSV headers and row data as JSON.
Your job is purely to map the provided semantic data into the defined CRM schema.

CRITICAL RULES:
- You are NOT allowed to rewrite values.
- You are NOT allowed to improve values.
- You are NOT allowed to generate realistic replacements or fake names.
- Every name, company, city, state, country, and note MUST be copied EXACTLY from the source row.
- Never fabricate information. Treat this as an information extraction task, NOT a text generation task.
- If a value is not explicitly present in the source, leave the field null.
- For CRM status, interpret intent. If the text implies they want to be contacted, use "GOOD_LEAD_FOLLOW_UP". If they refused, use "BAD_LEAD". If they couldn't be reached, use "DID_NOT_CONNECT". If they purchased, use "SALE_DONE". Otherwise null.
- NEVER map dates or values from date columns (e.g., Appointment Date, Meeting Date) to mobile numbers. Date columns must go into crm_note if unmapped.
- Identify mobile/phone numbers. Standardize as strings without formatting. Extract the country code separately. If there is an extension, put it in "crm_note" as "Extension: [ext]".
- For unmapped columns with useful information, append them to "crm_note". Standardize the format: use "Additional email: [email]" for extra emails, "Additional phone: [phone]" for extra phones, and "ColumnName: Value" for others. Separate multiple notes with " | ".
- If a row is completely irrelevant nonsense, DO NOT hallucinate data. Return null for all fields.
- "crm_note" should ONLY contain meaningful remarks, follow-up notes, secondary emails, or extra phone numbers.
- DO NOT dump irrelevant columns (e.g., "Campaign", "Ad Set", random IDs, or random garbage) into "crm_note". However, source platforms (e.g., "Hubspot", "Zoho", "Excel") or lead sources ARE highly relevant and MUST be included in notes.
- If a value in the input is completely empty, ignore it entirely and do not include its column name in the notes.
- Combine first name + last name into a single "name" field. If the name is explicitly missing or empty, you MAY infer it from the email address if the email clearly contains a person's name (e.g., john.doe@... -> John Doe).
- Primary Email and Phone numbers have ALREADY been extracted. If you see any additional or secondary emails/phones in the input, you MUST append them to the "crm_note" field. Do NOT output 'email' or 'mobile_without_country_code' fields.
- You should return exactly ${aiRows.length} objects in the "records" array — one per input row.
- Output ONLY valid JSON matching the schema. No markdown, no explanation.

Output JSON Format:
{
  "records": [
    {
      "name": "string | null",
      "company": "string | null",
      "city": "string | null",
      "state": "string | null",
      "country": "string | null",
      "lead_owner": "string | null",
      "crm_status": "string | null",
      "crm_note": "string | null",
      "data_source": "string | null",
      "possession_time": "string | null",
      "description": "string | null",
      "_row_id": "string (MUST preserve from input row)"
    }
  ]
}

Example:
Headers: ["First Name", "SurName", "Org"]
Row: [{"First Name": "John", "SurName": "Doe", "Org": "Acme Corp"}]
Output: {"records": [{"name": "John Doe", "company": "Acme Corp"}]}

---
CSV Headers: ${JSON.stringify(headers)}
Row Data:
${JSON.stringify(aiRows)}`;

  while (attempt < maxRetries) {
    let usedGroqIndex = currentGroqIndex;
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length, aiBatchSize: aiRows.length, provider }, 'Sending batch to AI');

      let aiRecords: any[] = [];
      
      if (aiRows.length > 0) {
        if (process.env.NODE_ENV === 'test') {
          aiRecords = await MockAIProvider.extract(headers, aiRows);
        } else if (provider === 'gemini') {
          const ai = getGeminiClient();
          const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: attempt > 0 ? 0.0 : 0.1,
              responseMimeType: 'application/json',
            }
          });
          const content = result.response.text();
          if (!content) throw new Error('Empty response from Gemini');
          let parsed;
          try {
            parsed = JSON.parse(stripMarkdownFences(content));
          } catch (e) {
            logger.error({ content: content.substring(0, 500) }, 'Failed to parse JSON from Gemini');
            throw e;
          }
          
          parsed = salvageExtractorJson(parsed);


          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, 'Zod validation failed on Gemini output');
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
        } else {
          const { client: groqClient, index: groqKeyIndex } = getGroqClient();
          usedGroqIndex = groqKeyIndex;
          const completion = await groqClient.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.'
              },
              { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: attempt > 0 ? 0.0 : 0.1,
            max_tokens: 8000,
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

          parsed = salvageExtractorJson(parsed);


          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, 'Zod validation failed on AI output');
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
        }
      }

      let skippedCount = 0;
      const skippedReasons: Record<string, number> = {};
      const skippedRecords: any[] = [];

      if (aiRecords.length < aiRows.length) {
        const truncatedCount = aiRows.length - aiRecords.length;
        logger.warn(`Row count mismatch: expected ${aiRows.length}, got ${aiRecords.length}. Tracking missing as skipped.`);
        skippedCount += truncatedCount;
        skippedReasons['AI Truncated Output (Missing Rows)'] = truncatedCount;
      }

      const validRecords: CrmRecord[] = [];
      
      let aiIndex = 0;

      for (let i = 0; i < extractedData.length; i++) {
        const d = extractedData[i];
        
        // Either pop from AI records if this row was sent to AI, or generate a null shell
        const aiRecord = d.needsAI && aiIndex < aiRecords.length 
          ? aiRecords[aiIndex++] 
          : { name: null, company: null, city: null, state: null, country: null, lead_owner: null, description: null, crm_status: null, crm_note: null, data_source: null, possession_time: null };

        // Merge the deterministic extraction with the LLM mapping (or empty shell)
        const mergedRecord = {
          ...aiRecord,
          email: d.email,
          mobile_without_country_code: d.mobile_without_country_code,
          created_at: d.created_at,
          _row_id: d._row_id
        };

        const normalized = normalizeAndValidate(mergedRecord);
        
        const hasContact = normalized.email || normalized.mobile_without_country_code;
        
        // Check for mostly empty records (only name exists)
        // Auto-extracted fields (email, phone, date, country_code, _row_id) don't count as
        // "meaningful" on their own — they were deterministically extracted, not AI-mapped.
        const AUTO_FIELDS = new Set(['name', 'email', 'mobile_without_country_code', 'created_at', 'country_code', '_row_id']);
        let meaningfulData = false;
        for (const [key, value] of Object.entries(normalized)) {
          if (!AUTO_FIELDS.has(key) && value !== null && value !== undefined) {
            meaningfulData = true;
            break;
          }
        }

        if (!hasContact) {
          skippedCount++;
          skippedReasons['AI Rejected (Missing Valid Contact Info)'] = (skippedReasons['AI Rejected (Missing Valid Contact Info)'] || 0) + 1;
          skippedRecords.push({ original: d.original, reason: 'AI Rejected (Missing Valid Contact Info)' });
        } else if (!meaningfulData) {
          skippedCount++;
          skippedReasons['AI Rejected (Lacks Meaningful Data)'] = (skippedReasons['AI Rejected (Lacks Meaningful Data)'] || 0) + 1;
          skippedRecords.push({ original: d.original, reason: 'AI Rejected (Lacks Meaningful Data)' });
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

      return { records: validRecords, skippedCount, skippedReasons, skippedRecords, processingTimeMs };

    } catch (error: any) {
      attempt++;

      const status = error?.status || error?.response?.status || (error.message?.includes('429') ? 429 : 500);
      const isRateLimit = status === 429 || error.message?.toLowerCase().includes('context_length_exceeded') || error.message?.toLowerCase().includes('too large');
      const errorMsgLower = error.message?.toLowerCase() || '';
      const isAuthError = status === 401 || status === 403 || 
        (status === 400 && error?.error?.code === 'organization_restricted') || 
        (status === 400 && errorMsgLower.includes('organization_restricted')) ||
        (status === 400 && errorMsgLower.includes('api key not valid')) ||
        errorMsgLower.includes('invalid api key');
      
      const shouldRotateKey = isRateLimit || isAuthError || error.message?.includes('All Groq keys are exhausted');

      if (shouldRotateKey) {
        if (provider === 'groq') {
          if (isAuthError && typeof usedGroqIndex === 'number') {
            markGroqKeyExhausted(usedGroqIndex);
          }
          if (keysTried < groqClients.length && availableGroqIndices.length > 0) {
            logger.warn(`Groq key hit limit (Status: ${status}). Retrying with next available key...`);
            keysTried++;
            attempt = 0; // Reset attempt so we don't fail out before trying all keys
            continue;
          } else {
            // Circuit Breaker: All keys exhausted or tried
            logger.error(`All ${groqClients.length} Groq keys exhausted or rate-limited. Opening circuit breaker for 2s.`);
            circuitBreakerOpenUntil = Date.now() + 2000;
          }
        }
        
        const limitError = new Error(isAuthError ? 'API Key exhausted or restricted' : 'Rate limit exceeded');
        (limitError as any).status = 429; // Coerce to 429 to avoid ugly 403 console errors in browser
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
