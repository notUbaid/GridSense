import { getGroqClient, getGeminiClient, getOpenAIClient, getAnthropicClient, getOpenRouterClient, markGroqKeyExhausted, markGeminiKeyExhausted } from './extractor';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import logger from '../utils/logger';
import { stripMarkdownFences, salvageMapperJson } from '../utils/ai-utils';

const MappingSchema = z.object({
  mapping: z.array(z.object({
    source: z.string(),
    target: z.string(),
    confidence: z.number().min(0).max(100),
  })),
  overallConfidence: z.number().min(0).max(100),
});

import crypto from 'crypto';

const headerCache = new Map<string, any>();

export async function mapHeadersToSchema(headers: string[]): Promise<any> {
  const startTime = Date.now();
  
  // Fingerprint headers
  const headerHash = crypto.createHash('sha256').update(headers.join('|').toLowerCase()).digest('hex');
  if (headerCache.has(headerHash)) {
    logger.info({ headerHash }, 'Header mapping cache hit');
    const cached = headerCache.get(headerHash);
    return { ...cached, processingTimeMs: Date.now() - startTime, cached: true };
  }

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
    const { client: groq, index } = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });
    resultString = completion.choices[0]?.message?.content || '{}';
  } catch (err: any) {
    if (err.status === 429 || err.status === 400 || err.status === 403) {
      // Assuming groq failed, let's not mark it as exhausted for mapper since mapper runs rarely, but we can
    }
    logger.warn({ err: err.message }, 'Groq mapping failed, falling back to Gemini');
    try {
      const { client: gemini } = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
      const result = await model.generateContent(prompt);
      resultString = result.response.text();
    } catch (err2: any) {
      logger.warn({ err: err2.message }, 'Gemini mapping failed, falling back to OpenAI');
      try {
        const { client: openai } = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 1024,
          response_format: { type: 'json_object' }
        });
        resultString = completion.choices[0]?.message?.content || '{}';
      } catch (err3: any) {
        logger.warn({ err: err3.message }, 'OpenAI mapping failed, falling back to Anthropic');
        try {
          const { client: anthropic } = getAnthropicClient();
          const message = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 1024,
          });
          const block = message.content.find(b => b.type === 'text');
          resultString = block?.type === 'text' ? block.text : '{}';
        } catch (err4: any) {
          logger.warn({ err: err4.message }, 'Anthropic mapping failed, falling back to OpenRouter');
          try {
            const { client: openrouter } = getOpenRouterClient();
            const completion = await openrouter.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: 'openai/gpt-4o-mini',
              temperature: 0,
              max_tokens: 1024,
              response_format: { type: 'json_object' }
            });
            resultString = completion.choices[0]?.message?.content || '{}';
          } catch (err5: any) {
            logger.error({ err: err5.message }, 'All providers failed for mapping headers');
            return { mapping: [], overallConfidence: 0, processingTimeMs: Date.now() - startTime };
          }
        }
      }
    }
  }

  try {
    const cleaned = stripMarkdownFences(resultString);
    const parsed = JSON.parse(cleaned);
    const salvaged = salvageMapperJson(parsed);
    
    // Save to cache
    headerCache.set(headerHash, salvaged);
    
    return { ...salvaged, processingTimeMs: Date.now() - startTime };
  } catch {
    logger.error({ rawResponse: resultString.substring(0, 200) }, 'Failed to parse mapper response');
    return { mapping: [], overallConfidence: 0, processingTimeMs: Date.now() - startTime };
  }
}
