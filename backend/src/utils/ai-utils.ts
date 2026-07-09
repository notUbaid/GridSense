/**
 * Shared AI response parsing utilities.
 * Extracted to prevent duplication between extractor.ts and mapper.ts.
 */

/**
 * Strips markdown code fences (```json ... ```) that LLMs sometimes
 * wrap around their JSON output despite being told not to.
 */
export function stripMarkdownFences(raw: string): string {
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

/**
 * Repairs a truncated JSON string by closing unclosed strings, removing trailing commas,
 * appending 'null' to dangling colons, and popping matching brackets/braces.
 */
export function repairTruncatedJson(str: string): string {
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (c === '\\') {
      escapeNext = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') stack.pop();
    }
  }

  let repaired = str;
  if (inString) repaired += '"';
  
  // Clean up trailing commas or dangling colons before closing
  repaired = repaired.replace(/,\s*$/, '');
  if (repaired.trim().endsWith(':')) {
    repaired += 'null';
  }

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

/** Valid CRM status enum values */
export const VALID_CRM_STATUSES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;

/** Valid data source enum values */
export const VALID_DATA_SOURCES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;

/**
 * Attempts to salvage a partially-correct AI JSON response by:
 * 1. Wrapping bare arrays in { records: [...] }
 * 2. Normalizing empty strings to null
 * 3. Clamping invalid enum values to null
 */
export function salvageExtractorJson(parsed: any): any {
  if (Array.isArray(parsed)) {
    parsed = { records: parsed };
  }

  if (parsed && Array.isArray(parsed.records)) {
    for (const record of parsed.records) {
      if (typeof record === 'object' && record !== null) {
        for (const key of Object.keys(record)) {
          const val = record[key];
          if (val === '') {
            record[key] = null;
          } else if (typeof val === 'object' && val !== null) {
            // Flatten hallucinated nested structures (e.g. { name: ["John", "Doe"] })
            record[key] = Array.isArray(val) ? val.join(' ') : JSON.stringify(val);
          }
        }

        if (
          record.crm_status &&
          !(VALID_CRM_STATUSES as readonly string[]).includes(record.crm_status)
        ) {
          record.crm_status = null;
        }

        if (
          record.data_source &&
          !(VALID_DATA_SOURCES as readonly string[]).includes(record.data_source)
        ) {
          record.data_source = null;
        }
      }
    }
  }
  return parsed;
}

/**
 * Attempts to salvage the mapper AI response.
 * If the response has a `mapping` array, returns it as-is.
 * Otherwise returns an empty fallback.
 */
export function salvageMapperJson(parsed: any): any {
  if (typeof parsed === 'object' && parsed !== null && parsed.mapping) {
    return parsed;
  }
  return { mapping: [], overallConfidence: 0 };
}
