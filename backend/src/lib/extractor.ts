import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { CrmRecord, CrmRecordSchema } from '../validation/schema';
import logger from '../utils/logger';
import { config } from '../config';

let groq: Groq | null = null;

function getGroqClient() {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please add it to Vercel Environment Variables.');
  }
  if (!groq) {
    groq = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return groq;
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

export async function processBatch(headers: string[], rows: Record<string, string>[]) {
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
- If multiple phone numbers exist, use the first as "phone_local" and append the rest to "crm_note".
- "crm_status" MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — or null.
- "data_source" MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — or null.
- Combine first name + last name into a single "name" field.
- Strip formatting from phone numbers (spaces, dashes, parentheses).
- You MUST return exactly ${rows.length} objects in the "records" array — one per input row.
- Output ONLY valid JSON. No markdown, no explanation.

JSON Schema:
${JSON.stringify(zodToJsonSchema(responseSchema as any))}

Example:
Headers: ["First Name", "SurName", "Email Address", "Phone", "Org"]
Row: [{"First Name": "John", "SurName": "Doe", "Email Address": "john@acme.com", "Phone": "555-0198", "Org": "Acme Corp"}]
Output: {"records": [{"name": "John Doe", "email": "john@acme.com", "phone_local": "5550198", "company": "Acme Corp"}]}

---
CSV Headers: ${JSON.stringify(headers)}
Row Data:
${JSON.stringify(rows)}`;

  while (attempt < maxRetries) {
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length }, 'Sending batch to Groq');

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
      const parsed = JSON.parse(cleaned);
      const validated = responseSchema.parse(parsed);
      const records = validated.records;

      if (records.length !== rows.length) {
        throw new Error(`Row count mismatch: expected ${rows.length}, got ${records.length}`);
      }

      let skippedCount = 0;
      const validRecords: CrmRecord[] = [];

      for (const record of records) {
        const hasContact = record.email || record.phone_local;
        if (!hasContact) {
          skippedCount++;
        } else {
          validRecords.push(record);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info({
        batchSize: rows.length,
        extracted: validRecords.length,
        skipped: skippedCount,
        ms: processingTimeMs
      }, 'Batch complete');

      return { records: validRecords, skippedCount, processingTimeMs };

    } catch (error: any) {
      attempt++;

      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429;
      const isTransientError = status >= 500;

      if (!isRateLimit && !isTransientError && !(error instanceof SyntaxError)) {
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
