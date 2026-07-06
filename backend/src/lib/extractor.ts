import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { CrmRecord, CrmRecordSchema } from '../validation/schema';
import logger from '../utils/logger';
import { config } from '../config';

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

const responseSchema = z.object({
  records: z.array(CrmRecordSchema),
});

export async function processBatch(headers: string[], rows: Record<string, string>[]) {
  let attempt = 0;
  const maxRetries = config.AI_MAX_RETRIES;
  const startTime = Date.now();

  const prompt = `You are an expert data extraction AI. You will be provided with CSV headers and a JSON array of row data.
Your task is to accurately map this data to a standardized CRM schema and return the result as a JSON object containing a "records" array.
Use semantic understanding to figure out which column maps to which CRM field. Do not guess information that is not present.
If a row cannot be extracted at all, leave the fields null, but still return the object in the array to preserve the batch size.
Output ONLY valid JSON.

Here is the JSON schema you MUST strictly follow:
${JSON.stringify(zodToJsonSchema(responseSchema), null, 2)}

### Few-Shot Example
If headers are: ["First Name", "SurName", "Email Address", "Phone", "Org"]
And row data is: [{"First Name": "John", "SurName": "Doe", "Email Address": "john@acme.com", "Phone": "555-0198", "Org": "Acme Corp"}]
You should map it to:
{
  "records": [
    {
      "name": "John Doe",
      "email": "john@acme.com",
      "mobile_without_country_code": "555-0198",
      "company": "Acme Corp"
    }
  ]
}

---
CSV Headers: ${JSON.stringify(headers)}

Row Data:
${JSON.stringify(rows, null, 2)}`;

  while (attempt < maxRetries) {
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length }, 'Sending batch to Groq');
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent data extraction system. You must output ONLY valid JSON matching the exact schema requested.'
          },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      const parsed = JSON.parse(content);
      const validated = responseSchema.parse(parsed);
      const records = validated.records;

      if (records.length !== rows.length) {
        throw new Error(`LLM output mismatch. Expected ${rows.length} records, got ${records.length}.`);
      }

      let skippedCount = 0;
      const validRecords: CrmRecord[] = [];

      for (const record of records) {
        const isSkipped = Object.values(record).every(val => !val);
        if (isSkipped) {
          skippedCount++;
        } else {
          validRecords.push(record);
        }
      }

      const processingTimeMs = Date.now() - startTime;
      
      logger.info({ 
        batchSize: rows.length, 
        validCount: validRecords.length, 
        skippedCount, 
        processingTimeMs 
      }, 'Batch processing successful');

      return { records: validRecords, skippedCount, processingTimeMs };

    } catch (error: any) {
      attempt++;
      
      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429;
      const isTransientError = status >= 500;
      
      if (!isRateLimit && !isTransientError) {
        logger.error({ err: error.message, status }, 'Non-retriable error encountered');
        throw error;
      }
      
      if (attempt >= maxRetries) {
        logger.error('Max retries reached for batch processing');
        throw error;
      }

      const baseDelay = isRateLimit ? config.AI_RETRY_DELAY_MS * 1.5 : config.AI_RETRY_DELAY_MS;
      const delayMs = (baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 1000;
      
      logger.warn({ attempt, delayMs, err: error.message }, 'Retrying batch after delay');
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Failed to process batch after retries');
}
