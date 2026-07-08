import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import logger from '../utils/logger';
import { stripMarkdownFences, salvageMapperJson } from '../utils/ai-utils';

let groqClient: Groq | null = null;
let genAI: GoogleGenerativeAI | null = null;

function getGroqClient() {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing.');
  }
  if (!groqClient) {
    const keys = config.GROQ_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid GROQ API keys found.');
    groqClient = new Groq({ apiKey: keys[0] });
  }
  return groqClient;
}

function getGeminiClient() {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing.');
  }
  if (!genAI) genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  return genAI;
}

const MappingSchema = z.object({
  mapping: z.array(z.object({
    source: z.string(),
    target: z.string(),
    confidence: z.number().min(0).max(100),
  })),
  overallConfidence: z.number().min(0).max(100),
});

export async function mapHeadersToSchema(headers: string[]): Promise<any> {
  const startTime = Date.now();
  const schemaKeys = [
    'name', 'email', 'mobile_without_country_code', 'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note', 'data_source', 'possession_time', 'description'
  ];

  const prompt = `You are a data architect. Given a list of CSV headers, map them to the corresponding fields in our CRM schema.
CRITICAL RULES:
- Only map a header if it directly aligns with a target field.
- If a header does not cleanly map to any field, do not include it.
- Return a JSON object exactly matching the provided schema.
- Assign a confidence score from 0 to 100 for each mapping.

Target CRM Fields:
${schemaKeys.join(', ')}

CSV Headers to map:
${JSON.stringify(headers)}

JSON Schema:
${JSON.stringify(zodToJsonSchema(MappingSchema as any))}
`;

  let resultString = '';
  
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: 'json_object' }
    });
    resultString = completion.choices[0]?.message?.content || '{}';
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Groq mapping failed, falling back to Gemini');
    try {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } });
      const result = await model.generateContent(prompt);
      resultString = result.response.text();
    } catch (e: any) {
      logger.error({ err: e.message }, 'Both Groq and Gemini failed for mapping headers');
      return { mapping: [], overallConfidence: 0, processingTimeMs: Date.now() - startTime };
    }
  }

  try {
    const cleaned = stripMarkdownFences(resultString);
    const parsed = JSON.parse(cleaned);
    const salvaged = salvageMapperJson(parsed);
    return { ...salvaged, processingTimeMs: Date.now() - startTime };
  } catch {
    logger.error({ rawResponse: resultString.substring(0, 200) }, 'Failed to parse mapper response');
    return { mapping: [], overallConfidence: 0, processingTimeMs: Date.now() - startTime };
  }
}
