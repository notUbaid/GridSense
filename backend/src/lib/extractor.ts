import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereClientV2 } from 'cohere-ai';
import Papa from 'papaparse';
import { z } from 'zod';
import { CrmRecord, CrmRecordSchema } from '../validation/schema';
import logger from '../utils/logger';
import { config } from '../config';
import { MockAIProvider } from './MockAIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { stripMarkdownFences, salvageExtractorJson, repairTruncatedJson, VALID_CRM_STATUSES, VALID_DATA_SOURCES } from '../utils/ai-utils';

let groqClients: Groq[] = [];
let currentGroqIndex = 0;
let availableGroqIndices: number[] = [];
let geminiClients: GoogleGenerativeAI[] = [];
let currentGeminiIndex = 0;
let availableGeminiIndices: number[] = [];

let openaiClients: OpenAI[] = [];
let currentOpenAIIndex = 0;
let availableOpenAIIndices: number[] = [];

let anthropicClients: Anthropic[] = [];
let currentAnthropicIndex = 0;
let availableAnthropicIndices: number[] = [];

let openRouterClients: OpenAI[] = [];
let currentOpenRouterIndex = 0;
let availableOpenRouterIndices: number[] = [];

let cohereClients: CohereClientV2[] = [];
let currentCohereIndex = 0;
let availableCohereIndices: number[] = [];

export function getGroqClient(): { client: Groq, index: number } {
  if (!config.GROQ_API_KEY) {
    const limitError = new Error('GROQ API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'groq';
    throw limitError;
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

  // Round-robin selection — select THEN increment to avoid skipping index 0
  const selectedIndex = availableGroqIndices[currentGroqIndex % availableGroqIndices.length];
  currentGroqIndex = (currentGroqIndex + 1) % availableGroqIndices.length;
  
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

export function getGeminiClient(): { client: GoogleGenerativeAI, index: number } {
  if (!config.GEMINI_API_KEY) {
    const limitError = new Error('GEMINI API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'gemini';
    throw limitError;
  }
  if (geminiClients.length === 0) {
    const keys = config.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid GEMINI API keys found.');
    geminiClients = keys.map(key => new GoogleGenerativeAI(key));
    availableGeminiIndices = geminiClients.map((_, i) => i);
  }
  
  if (availableGeminiIndices.length === 0) {
    throw new Error('All Gemini keys are exhausted.');
  }

  // Round-robin selection
  const selectedIndex = availableGeminiIndices[currentGeminiIndex % availableGeminiIndices.length];
  currentGeminiIndex = (currentGeminiIndex + 1) % availableGeminiIndices.length;
  
  return { client: geminiClients[selectedIndex], index: selectedIndex };
}

export function markGeminiKeyExhausted(index: number) {
  if (!availableGeminiIndices.includes(index)) return; // Already exhausted
  availableGeminiIndices = availableGeminiIndices.filter(i => i !== index);
  logger.warn(`Gemini key at index ${index} marked as exhausted. ${availableGeminiIndices.length} keys remaining. Will restore in 60s.`);
  
  // TTL-based recovery
  setTimeout(() => {
    if (!availableGeminiIndices.includes(index)) {
      availableGeminiIndices.push(index);
      logger.info(`Gemini key at index ${index} restored after 60s timeout. ${availableGeminiIndices.length} keys available.`);
    }
  }, 60000);
}

export function getOpenAIClient(): { client: OpenAI, index: number } {
  if (!config.OPENAI_API_KEY) {
    const limitError = new Error('OPENAI API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'openai';
    throw limitError;
  }
  if (openaiClients.length === 0) {
    const keys = config.OPENAI_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid OPENAI API keys found.');
    openaiClients = keys.map(key => new OpenAI({ apiKey: key }));
    availableOpenAIIndices = openaiClients.map((_, i) => i);
  }
  if (availableOpenAIIndices.length === 0) throw new Error('All OpenAI keys are exhausted.');
  const selectedIndex = availableOpenAIIndices[currentOpenAIIndex % availableOpenAIIndices.length];
  currentOpenAIIndex = (currentOpenAIIndex + 1) % availableOpenAIIndices.length;
  return { client: openaiClients[selectedIndex], index: selectedIndex };
}

export function markOpenAIKeyExhausted(index: number) {
  if (!availableOpenAIIndices.includes(index)) return;
  availableOpenAIIndices = availableOpenAIIndices.filter(i => i !== index);
  logger.warn(`OpenAI key at index ${index} marked as exhausted. ${availableOpenAIIndices.length} remaining.`);
  setTimeout(() => {
    if (!availableOpenAIIndices.includes(index)) {
      availableOpenAIIndices.push(index);
      logger.info(`OpenAI key at index ${index} restored.`);
    }
  }, 60000);
}

export function getAnthropicClient(): { client: Anthropic, index: number } {
  if (!config.ANTHROPIC_API_KEY) {
    const limitError = new Error('ANTHROPIC API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'anthropic';
    throw limitError;
  }
  if (anthropicClients.length === 0) {
    const keys = config.ANTHROPIC_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid ANTHROPIC API keys found.');
    anthropicClients = keys.map(key => new Anthropic({ apiKey: key }));
    availableAnthropicIndices = anthropicClients.map((_, i) => i);
  }
  if (availableAnthropicIndices.length === 0) throw new Error('All Anthropic keys are exhausted.');
  const selectedIndex = availableAnthropicIndices[currentAnthropicIndex % availableAnthropicIndices.length];
  currentAnthropicIndex = (currentAnthropicIndex + 1) % availableAnthropicIndices.length;
  return { client: anthropicClients[selectedIndex], index: selectedIndex };
}

export function markAnthropicKeyExhausted(index: number) {
  if (!availableAnthropicIndices.includes(index)) return;
  availableAnthropicIndices = availableAnthropicIndices.filter(i => i !== index);
  logger.warn(`Anthropic key at index ${index} marked as exhausted. ${availableAnthropicIndices.length} remaining.`);
  setTimeout(() => {
    if (!availableAnthropicIndices.includes(index)) {
      availableAnthropicIndices.push(index);
      logger.info(`Anthropic key at index ${index} restored.`);
    }
  }, 60000);
}

export function getOpenRouterClient(): { client: OpenAI, index: number } {
  if (!config.OPENROUTER_API_KEY) {
    const limitError = new Error('OPENROUTER API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'openrouter';
    throw limitError;
  }
  if (openRouterClients.length === 0) {
    const keys = config.OPENROUTER_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid OPENROUTER API keys found.');
    openRouterClients = keys.map(key => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: key }));
    availableOpenRouterIndices = openRouterClients.map((_, i) => i);
  }
  if (availableOpenRouterIndices.length === 0) throw new Error('All OpenRouter keys are exhausted.');
  const selectedIndex = availableOpenRouterIndices[currentOpenRouterIndex % availableOpenRouterIndices.length];
  currentOpenRouterIndex = (currentOpenRouterIndex + 1) % availableOpenRouterIndices.length;
  return { client: openRouterClients[selectedIndex], index: selectedIndex };
}

export function markOpenRouterKeyExhausted(index: number) {
  if (!availableOpenRouterIndices.includes(index)) return;
  availableOpenRouterIndices = availableOpenRouterIndices.filter(i => i !== index);
  logger.warn(`OpenRouter key at index ${index} marked as exhausted. ${availableOpenRouterIndices.length} remaining.`);
  setTimeout(() => {
    if (!availableOpenRouterIndices.includes(index)) {
      availableOpenRouterIndices.push(index);
      logger.info(`OpenRouter key at index ${index} restored.`);
    }
  }, 60000);
}

export function getCohereClient(): { client: CohereClientV2, index: number } {
  if (!config.COHERE_API_KEY) {
    const limitError = new Error('COHERE API Key is missing.');
    (limitError as any).status = 403;
    (limitError as any).exhaustedProvider = 'cohere';
    throw limitError;
  }
  if (cohereClients.length === 0) {
    const keys = config.COHERE_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) throw new Error('No valid COHERE API keys found.');
    cohereClients = keys.map(key => new CohereClientV2({ token: key }));
    availableCohereIndices = cohereClients.map((_, i) => i);
  }
  if (availableCohereIndices.length === 0) throw new Error('All Cohere keys are exhausted.');
  const selectedIndex = availableCohereIndices[currentCohereIndex % availableCohereIndices.length];
  currentCohereIndex = (currentCohereIndex + 1) % availableCohereIndices.length;
  return { client: cohereClients[selectedIndex], index: selectedIndex };
}

export function markCohereKeyExhausted(index: number) {
  if (!availableCohereIndices.includes(index)) return;
  availableCohereIndices = availableCohereIndices.filter(i => i !== index);
  logger.warn(`Cohere key at index ${index} marked as exhausted. ${availableCohereIndices.length} remaining.`);
  setTimeout(() => {
    if (!availableCohereIndices.includes(index)) {
      availableCohereIndices.push(index);
      logger.info(`Cohere key at index ${index} restored.`);
    }
  }, 60000);
}


const LlmRecordSchema = CrmRecordSchema.omit({ 
  email: true, 
  mobile_without_country_code: true, 
  created_at: true,
  country_code: true,
  _row_id: true
});

const llmResponseSchema = z.object({
  records: z.array(LlmRecordSchema),
});

// stripMarkdownFences and salvageExtractorJson are imported from '../utils/ai-utils'
// to avoid code duplication with mapper.ts

function normalizeAndValidate(record: any): CrmRecord {
  const norm = { ...record };

  // 1. Whitespace, Placeholder & NaN Normalization
  for (const key of Object.keys(norm)) {
    if (typeof norm[key] === 'string') {
      let val = norm[key].trim();
      
      // Remove specific placeholders like <email>, [missing], etc that AI might hallucinate.
      // We no longer blindly remove all text inside brackets/chevrons as it corrupts valid data (e.g. [donotemail]).
      val = val.replace(/(?:<missing>|\[missing\]|<null>|\[null\]|<empty>|\[empty\]|<unknown>|\[unknown\]|<email>|\[email\]|<phone>|\[phone\])/gi, '').trim();
      val = val.replace(/\s{2,}/g, ' '); // Collapse multiple spaces resulting from removal
      
      const lower = val.toLowerCase();
      if (val === '' || lower === 'nan' || lower === 'null') {
        norm[key] = null;
      } else if (key === 'created_at') {
        const parsedDate = Date.parse(val.replace(/\./g, '-'));
        if (!isNaN(parsedDate)) {
          norm[key] = new Date(parsedDate).toISOString();
        } else {
          norm[key] = null; // invalid date
        }
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

  // 2. Email Validation & Extraction
  if (norm.email) {
    const origEmail = String(norm.email);
    const match = origEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) {
      norm.email = match[0];
      const remainder = origEmail.replace(match[0], '').trim();
      if (remainder.length > 0) {
        norm.crm_note = norm.crm_note ? `${norm.crm_note} | Extra email info: ${remainder}` : `Extra email info: ${remainder}`;
      }
    } else {
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
    
    if (phoneStr.startsWith('00')) {
      phoneStr = '+' + phoneStr.slice(2);
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
const DATE_FORMAT_REGEX = /\b(?:(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.\s]*(?:19|20)\d{2}|\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+(?:19|20)\d{2})\b/i;
const TEXT_DATE_REGEX = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*|\s+|-)?(?:19|20)\d{2}\b/i;
const DIGIT_REGEX = /\d/g;

function resolveRelativeDate(_str: string): number | null {
  // We explicitly reject relative dates (Yesterday, Last Week) as requested by the user,
  // preventing them from being improperly converted into static timestamps.
  return null;
}

// NOTE: Module-level mutable state. In serverless (Vercel), each cold start
// gets a fresh scope. In local dev (long-running Express), this is shared
// across all requests — intentional for single-user dev mode.
let circuitBreakerOpenUntil = 0;

export async function processBatch(
  headers: string[], 
  rows: Record<string, string>[],
  provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'cohere' = 'groq',
  schemaMapping?: { source: string, target?: string | null, confidence?: any }[] | null,
  columnsToAppendToNotes?: string[] | null
) {
  let promptChars = 0;
  let responseChars = 0;
  let promptTokens = 0;
  let responseTokens = 0;
  let apiLatencyMs = 0;
  let parseLatencyMs = 0;
  let attempt = 0;
  let keysTried = 1;
  const maxRetries = config.AI_MAX_RETRIES;
  const startTime = Date.now();

  if (['groq', 'gemini', 'openai', 'anthropic', 'openrouter'].includes(provider) && Date.now() < circuitBreakerOpenUntil) {
    const limitError = new Error('API Key exhausted or restricted (Circuit Breaker Open)');
    (limitError as any).status = 429;
    (limitError as any).exhaustedProvider = provider;
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
        const value = sanitized[key];
        if (!value) continue;
        
        const relative = resolveRelativeDate(value);
        if (relative) {
          created_at = new Date(relative).toISOString();
          delete sanitized[key];
          break;
        }

        const dateMatch = value.match(DATE_FORMAT_REGEX) || value.match(TEXT_DATE_REGEX);
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
        const isNoteColumn = /note|desc|comment|history|message|detail|context/i.test(key);
        const isEmailColumn = /e-?mail/i.test(key);

        if (isEmailColumn) {
          const match = value.match(EMAIL_REGEX);
          if (match) {
            email = match[0];
            const remainder = value.replace(match[0], '').trim();
            if (remainder.length > 0) {
              sanitized.crm_note = sanitized.crm_note ? `${sanitized.crm_note} | Extra email info: ${remainder}` : `Extra email info: ${remainder}`;
            }
            value = '';
          }
        }
      }

      if (!created_at && /created|enquiry|added|submitted|timestamp|lead date/i.test(key)) {
        const relative = resolveRelativeDate(value);
        if (relative) {
          created_at = new Date(relative).toISOString();
          value = '';
        } else {
          const dateMatch = value.match(DATE_FORMAT_REGEX) || value.match(TEXT_DATE_REGEX);
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
        const isPhoneColumn = /phone|mobile|cell|whatsapp|contact/i.test(key);
        
        if (isPhoneColumn) {
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
        
        const isExplicitAppend = columnsToAppendToNotes && columnsToAppendToNotes.includes(key);

        if (valTrimmed.includes('@') && EMAIL_REGEX.test(valTrimmed)) {
           extraNotes.push(`Additional email: ${valTrimmed}`);
        } else if ((valTrimmed.match(DIGIT_REGEX) || []).length >= 7 && (PHONE_FORMAT_REGEX.test(valTrimmed) || PHONE_EMBEDDED_REGEX.test(valTrimmed))) {
           extraNotes.push(`Additional phone: ${valTrimmed}`);
        } else if (isExplicitAppend || keyLower.includes('note') || keyLower.includes('remark') || keyLower.includes('comment') || keyLower.includes('feedback')) {
           extraNotes.push(`${key}: ${valTrimmed}`);
        }
      }

      if (extraNotes.length > 0) {
         record.crm_note = record.crm_note ? record.crm_note + ' | ' + extraNotes.join(' | ') : extraNotes.join(' | ');
      }

      const normalized = normalizeAndValidate(record);
      
      const hasContact = normalized.email || normalized.mobile_without_country_code;

      if (!hasContact) {
        skippedCount++;
        const phone = record.mobile_without_country_code || '';
        const digits = (String(phone).match(/\d/g) || []).length;
        const emailReason = record.email ? 'email format invalid' : 'No valid email detected';
        const phoneReason = digits < 7 ? `phone contained only ${digits} digits` : 'phone format invalid';
        const reason = `Rejected (Record skipped because no usable contact exists: ${emailReason}, ${phoneReason})`;
        
        skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
        skippedRecords.push({ original, reason });
      } else {
        validRecords.push(normalized);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    logger.info({ batchSize: rows.length, extracted: validRecords.length, skipped: skippedCount, ms: processingTimeMs }, 'Deterministic batch complete');
    return { records: validRecords, skippedCount, skippedReasons, skippedRecords, processingTimeMs, metrics: { promptChars, responseChars, promptTokens, responseTokens, apiLatencyMs, parseLatencyMs, retries: attempt } };
  }

  const prompt = `You are a strict data extraction engine. You receive CSV headers and row data as JSON.
Your job is purely to map the provided semantic data into the defined CRM schema.

CRITICAL RULES:
- You are NOT allowed to rewrite values.
- You are NOT allowed to improve values.
- You are NOT allowed to generate realistic replacements or fake names.
- Every name, company, city, state, country, and note MUST be copied EXACTLY from the source row.
- Never fabricate information. Treat this as an information extraction task, NOT a text generation task.
- IMPORTANT: DO NOT output any keys where the value would be null. Omit them entirely from the JSON object to save output tokens.
- For CRM status, interpret intent. If the text implies they want to be contacted, use "GOOD_LEAD_FOLLOW_UP". If they refused, use "BAD_LEAD". If they couldn't be reached, use "DID_NOT_CONNECT". If they purchased, use "SALE_DONE". Otherwise omit the key.
- For data_source, ONLY use one of: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots". If none match confidently, leave it blank (omit).
- NEVER map dates, IDs, zip codes, or amounts (e.g., Appointment Date, Lead ID, Salary) to mobile numbers. Date columns must go into crm_note if unmapped.
- Identify mobile/phone numbers. Standardize as strings without formatting. Extract the country code separately. If there is an extension, put it in "crm_note" as "Extension: [ext]".
- For unmapped columns with useful information, append them to "crm_note". Format them cleanly in Title Case like "Platform: Instagram" or "Campaign: Q3 Retargeting" instead of raw machine names. Separate multiple notes with " | ".
- If a row is completely irrelevant nonsense, DO NOT hallucinate data. Return an empty object {}.
- "crm_note" should ONLY contain meaningful remarks, follow-up notes, secondary emails, or extra phone numbers.
- For general business requirements, customer needs, or lead summaries (e.g., "Searching for MBA admission", "Looking for 3BHK", "Needs consultation"), map them directly to the "description" field instead of placing them in "crm_note".
- DO NOT dump irrelevant columns (e.g., "Campaign", "Ad Set", random IDs, or random garbage) into "crm_note". However, source platforms (e.g., "Hubspot", "Zoho", "Excel") or lead sources ARE highly relevant and MUST be included in notes.
- If a value in the input is completely empty, ignore it entirely and do not include its column name in the notes.
- Combine first name + last name into a single "name" field. If the name is explicitly missing or empty, you MAY infer it from the email address if the email clearly contains a person's name (e.g., john.doe@... -> John Doe).
- Primary Email and Phone numbers have ALREADY been extracted. If you see any additional or secondary emails/phones in the input, you MUST append them to the "crm_note" field. Do NOT output 'email' or 'mobile_without_country_code' fields.
- You should return exactly ${aiRows.length} objects in the "records" array — one per input row. Ensure the output array order exactly matches the input CSV row order.
- Output ONLY valid JSON matching the schema. No markdown, no explanation.

Output JSON Format (only include keys that have values, omit all nulls):
{
  "records": [
    {
      "name": "string",
      "company": "string",
      "city": "string",
      "state": "string",
      "country": "string",
      "lead_owner": "string",
      "crm_status": "string",
      "crm_note": "string",
      "data_source": "string",
      "possession_time": "string",
      "description": "string"
    }
  ]
}

Example:
CSV Headers: ["First Name", "SurName", "Org"]
CSV Rows:
John,Doe,Acme Corp
Output: {"records": [{"name": "John Doe", "company": "Acme Corp"}]}

---
CSV Headers: ${JSON.stringify(headers)}
CSV Rows:
${Papa.unparse(aiRows, { header: false })}`;
  promptChars = prompt.length;

  while (attempt < maxRetries) {
    let usedGroqIndex = currentGroqIndex;
    let usedGeminiIndex = currentGeminiIndex;
    let usedOpenAIIndex = currentOpenAIIndex;
    let usedAnthropicIndex = currentAnthropicIndex;
    let usedOpenRouterIndex = currentOpenRouterIndex;
    let usedCohereIndex = currentCohereIndex;
    try {
      logger.info({ attempt: attempt + 1, batchSize: rows.length, aiBatchSize: aiRows.length, provider }, 'Sending batch to AI');

      let aiRecords: any[] = [];
      
      if (aiRows.length > 0) {
        if (process.env.NODE_ENV === 'test') {
          aiRecords = await MockAIProvider.extract(headers, aiRows);
        } else if (provider === 'gemini') {
          const { client: ai, index: geminiKeyIndex } = getGeminiClient();
          usedGeminiIndex = geminiKeyIndex;
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });
          const apiStart = performance.now();
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: attempt > 0 ? 0.0 : 0.1,
              maxOutputTokens: Math.min(16384, Math.max(4096, aiRows.length * 200)),
            }
          });
          apiLatencyMs = performance.now() - apiStart;
          const content = result.response.text();
          if (!content) throw new Error('Empty response from Gemini');
          responseChars = content.length;
          promptTokens = result.response.usageMetadata?.promptTokenCount || 0;
          responseTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
          
          const parseStart = performance.now();
          let parsed;
          try {
            parsed = JSON.parse(stripMarkdownFences(content));
          } catch (e) {
            logger.warn({ content: content.substring(0, 500) }, 'JSON parse failed, attempting to repair truncated JSON');
            try {
              const repaired = repairTruncatedJson(stripMarkdownFences(content));
              parsed = JSON.parse(repaired);
              logger.info('Successfully repaired truncated JSON from Gemini');
            } catch {
              logger.error({ content: content.substring(0, 500) }, 'Failed to parse JSON from Gemini even after repair attempt');
              throw e;
            }
          }
          
          parsed = salvageExtractorJson(parsed);

          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, 'Zod validation failed on Gemini output');
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
          parseLatencyMs = performance.now() - parseStart;
        } else if (provider === 'openai' || provider === 'openrouter') {
          const isRouter = provider === 'openrouter';
          const { client, index } = isRouter ? getOpenRouterClient() : getOpenAIClient();
          if (isRouter) usedOpenRouterIndex = index;
          else usedOpenAIIndex = index;

          const apiStart = performance.now();
          const completion = await client.chat.completions.create({
            messages: [
              { role: 'system', content: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.' },
              { role: 'user', content: prompt }
            ],
            model: isRouter ? 'google/gemma-4-31b-it:free' : 'gpt-4o-mini',
            temperature: attempt > 0 ? 0.0 : 0.1,
            max_tokens: Math.min(4000, Math.max(1024, aiRows.length * 80)),
            response_format: { type: 'json_object' },
          });
          apiLatencyMs = performance.now() - apiStart;

          const content = completion.choices[0]?.message?.content;
          if (!content) throw new Error(`Empty response from ${provider}`);
          responseChars = content.length;
          promptTokens = completion.usage?.prompt_tokens || 0;
          responseTokens = completion.usage?.completion_tokens || 0;

          const parseStart = performance.now();
          const cleaned = stripMarkdownFences(content);
          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            logger.warn({ content: cleaned.substring(0, 500) }, 'JSON parse failed, attempting to repair truncated JSON');
            try {
              const repaired = repairTruncatedJson(cleaned);
              parsed = JSON.parse(repaired);
            } catch {
              throw e;
            }
          }
          parsed = salvageExtractorJson(parsed);
          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, `Zod validation failed on ${provider} output`);
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
          parseLatencyMs = performance.now() - parseStart;
        } else if (provider === 'anthropic') {
          const { client, index } = getAnthropicClient();
          usedAnthropicIndex = index;

          const apiStart = performance.now();
          const message = await client.messages.create({
            model: 'claude-3-5-haiku-20241022',
            system: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.',
            messages: [{ role: 'user', content: prompt }],
            temperature: attempt > 0 ? 0.0 : 0.1,
            max_tokens: Math.min(4000, Math.max(1024, aiRows.length * 80)),
          });
          apiLatencyMs = performance.now() - apiStart;

          const block = message.content.find(b => b.type === 'text');
          const content = block?.type === 'text' ? block.text : '';
          if (!content) throw new Error(`Empty response from Anthropic`);
          responseChars = content.length;
          promptTokens = message.usage?.input_tokens || 0;
          responseTokens = message.usage?.output_tokens || 0;

          const parseStart = performance.now();
          const cleaned = stripMarkdownFences(content);
          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            logger.warn({ content: cleaned.substring(0, 500) }, 'JSON parse failed, attempting to repair truncated JSON');
            try {
              const repaired = repairTruncatedJson(cleaned);
              parsed = JSON.parse(repaired);
            } catch {
              throw e;
            }
          }
          parsed = salvageExtractorJson(parsed);
          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, `Zod validation failed on Anthropic output`);
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
          parseLatencyMs = performance.now() - parseStart;
        } else if (provider === 'cohere') {
          const { client, index } = getCohereClient();
          usedCohereIndex = index;

          const apiStart = performance.now();
          const completion = await client.chat({
            model: 'command-r-plus-08-2024',
            messages: [
              { role: 'system', content: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.' },
              { role: 'user', content: prompt }
            ],
            temperature: attempt > 0 ? 0.0 : 0.1,
            responseFormat: { type: 'json_object' }
          });
          apiLatencyMs = performance.now() - apiStart;

          const content = (completion.message?.content?.[0] as any)?.text;
          if (!content) throw new Error('Empty response from Cohere');
          responseChars = content.length;
          promptTokens = completion.usage?.billedUnits?.inputTokens || 0;
          responseTokens = completion.usage?.billedUnits?.outputTokens || 0;

          const parseStart = performance.now();
          const cleaned = stripMarkdownFences(content);
          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            logger.warn({ content: cleaned.substring(0, 500) }, 'JSON parse failed, attempting to repair truncated JSON');
            try {
              const repaired = repairTruncatedJson(cleaned);
              parsed = JSON.parse(repaired);
            } catch {
              throw e;
            }
          }
          parsed = salvageExtractorJson(parsed);
          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, 'Zod validation failed on Cohere output');
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
          parseLatencyMs = performance.now() - parseStart;
        } else {
          const { client: groqClient, index: groqKeyIndex } = getGroqClient();
          usedGroqIndex = groqKeyIndex;
          const apiStart = performance.now();
          const completion = await groqClient.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'You are a data extraction system. Output ONLY valid JSON matching the requested schema. No markdown fences, no commentary.'
              },
              { role: 'user', content: prompt }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: attempt > 0 ? 0.0 : 0.1,
            // Groq deducts TPM based on prompt_tokens + max_tokens requested.
            // Free tier has 6,000 TPM limit. Setting this too high causes instant 429s.
            // 35 rows generates ~1700 tokens. We cap max_tokens conservatively to 2100.
            max_tokens: Math.min(4000, Math.max(1024, aiRows.length * 60)),
            response_format: { type: 'json_object' },
          });
          apiLatencyMs = performance.now() - apiStart;

          const content = completion.choices[0]?.message?.content;
          if (!content) throw new Error('Empty response from Groq');
          responseChars = content.length;
          promptTokens = completion.usage?.prompt_tokens || 0;
          responseTokens = completion.usage?.completion_tokens || 0;

          const parseStart = performance.now();
          const cleaned = stripMarkdownFences(content);
          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            logger.warn({ content: cleaned.substring(0, 500) }, 'JSON parse failed, attempting to repair truncated JSON');
            try {
              const repaired = repairTruncatedJson(cleaned);
              parsed = JSON.parse(repaired);
              logger.info('Successfully repaired truncated JSON from Groq');
            } catch {
              logger.error({ content: cleaned.substring(0, 500) }, 'Failed to parse JSON from Groq even after repair attempt');
              throw e;
            }
          }

          parsed = salvageExtractorJson(parsed);


          const validated = llmResponseSchema.safeParse(parsed);
          if (!validated.success) {
            logger.error({ errors: validated.error.format() }, 'Zod validation failed on AI output');
            throw new Error('AI output did not match expected schema');
          }
          aiRecords = validated.data.records;
          parseLatencyMs = performance.now() - parseStart;
        }
      }

      let skippedCount = 0;
      const skippedReasons: Record<string, number> = {};
      const skippedRecords: any[] = [];

      if (aiRecords.length < aiRows.length) {
        const _truncatedCount = aiRows.length - aiRecords.length;
        logger.warn(`Row count mismatch: expected ${aiRows.length}, got ${aiRecords.length}. Tracking missing as skipped.`);
        // We do NOT increment skippedCount here, because the missing rows will be passed
        // as empty shells to the loop below, which will naturally fail the meaningfulData
        // check and properly increment skippedCount AND push to skippedRecords.
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
          email: d.email || aiRecord.email,
          mobile_without_country_code: d.mobile_without_country_code || aiRecord.mobile_without_country_code,
          created_at: d.created_at || aiRecord.created_at,
          _row_id: d._row_id
        };

        const normalized = normalizeAndValidate(mergedRecord);
        
        const hasContact = normalized.email || normalized.mobile_without_country_code;

        if (!hasContact) {
          skippedCount++;
          const phone = mergedRecord.mobile_without_country_code || '';
          const digits = (String(phone).match(/\d/g) || []).length;
          const emailReason = mergedRecord.email ? 'email format invalid' : 'No valid email detected';
          const phoneReason = digits < 7 ? `phone contained only ${digits} digits` : 'phone format invalid';
          const reason = `AI Rejected (Record skipped because no usable contact exists: ${emailReason}, ${phoneReason})`;

          skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
          skippedRecords.push({ original: d.original, reason });
        } else {
          validRecords.push(normalized);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info({
        batchSize: rows.length,
        extracted: validRecords.length,
        skipped: skippedCount,
        ms: processingTimeMs,
        metrics: { promptChars, responseChars, promptTokens, responseTokens, apiLatencyMs, parseLatencyMs, retries: attempt }
      }, 'Batch complete');

      return { records: validRecords, skippedCount, skippedReasons, skippedRecords, processingTimeMs, metrics: { promptChars, responseChars, promptTokens, responseTokens, apiLatencyMs, parseLatencyMs, retries: attempt } };

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
            logger.error(`All ${groqClients.length} Groq keys exhausted or rate-limited. Opening circuit breaker for 1s.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        } else if (provider === 'gemini') {
          if (isAuthError && typeof usedGeminiIndex === 'number') {
            markGeminiKeyExhausted(usedGeminiIndex);
          }
          if (keysTried < geminiClients.length && availableGeminiIndices.length > 0) {
            logger.warn(`Gemini key hit limit (Status: ${status}). Retrying with next available key...`);
            keysTried++;
            attempt = 0;
            continue;
          } else {
            logger.error(`All ${geminiClients.length} Gemini keys exhausted or rate-limited. Opening circuit breaker for 1s.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        } else if (provider === 'openai') {
          if (isAuthError && typeof usedOpenAIIndex === 'number') markOpenAIKeyExhausted(usedOpenAIIndex);
          if (keysTried < openaiClients.length && availableOpenAIIndices.length > 0) {
            logger.warn(`OpenAI key hit limit. Retrying...`);
            keysTried++;
            attempt = 0;
            continue;
          } else {
            logger.error(`All OpenAI keys exhausted.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        } else if (provider === 'anthropic') {
          if (isAuthError && typeof usedAnthropicIndex === 'number') markAnthropicKeyExhausted(usedAnthropicIndex);
          if (keysTried < anthropicClients.length && availableAnthropicIndices.length > 0) {
            logger.warn(`Anthropic key hit limit. Retrying...`);
            keysTried++;
            attempt = 0;
            continue;
          } else {
            logger.error(`All Anthropic keys exhausted.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        } else if (provider === 'openrouter') {
          if (isAuthError && typeof usedOpenRouterIndex === 'number') markOpenRouterKeyExhausted(usedOpenRouterIndex);
          if (keysTried < openRouterClients.length && availableOpenRouterIndices.length > 0) {
            logger.warn(`OpenRouter key hit limit. Retrying...`);
            keysTried++;
            attempt = 0;
            continue;
          } else {
            logger.error(`All OpenRouter keys exhausted.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        } else if (provider === 'cohere') {
          if (isAuthError && typeof usedCohereIndex === 'number') markCohereKeyExhausted(usedCohereIndex);
          if (keysTried < cohereClients.length && availableCohereIndices.length > 0) {
            logger.warn(`Cohere key hit limit. Retrying...`);
            keysTried++;
            attempt = 0;
            continue;
          } else {
            logger.error(`All Cohere keys exhausted.`);
            circuitBreakerOpenUntil = Date.now() + 1000;
          }
        }
        
        if (isAuthError) {
          const limitError = new Error('API Key exhausted or restricted');
          (limitError as any).status = 429; // Coerce to 429 to avoid ugly 403 console errors in browser
          (limitError as any).exhaustedProvider = provider;
          throw limitError;
        }
      }

      const isTransientError = status >= 500 || isRateLimit;

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
