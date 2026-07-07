import { z } from 'zod';

export const CrmRecordSchema = z.object({
  created_at: z.string().datetime().optional().nullable().describe("ISO-8601 date when the record was created. Leave null if unavailable."),
  name: z.string().optional().nullable().describe("Full name. Combine first and last name if separate."),
  email: z.string().optional().nullable().or(z.literal('')).describe("Primary email address. If multiple emails exist, use the first and append extras to crm_note."),
  country_code: z.string().optional().nullable().describe("Country dialing code (e.g., +1, +91). Infer from country if possible."),
  phone_local: z.string().optional().nullable().describe("Phone number without country code. Strip all formatting. If multiple numbers exist, use the first and append extras to crm_note."),
  company: z.string().optional().nullable().describe("Company or organization name."),
  city: z.string().optional().nullable().describe("City of residence or work."),
  state: z.string().optional().nullable().describe("State or province."),
  country: z.string().optional().nullable().describe("Country name."),
  lead_owner: z.string().optional().nullable().describe("Person responsible for this lead."),
  crm_status: z.string().optional().nullable().describe("Lead status. MUST be one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If the source data contains a status that maps clearly to one of these, use it. Otherwise leave null."),
  crm_note: z.string().optional().nullable().describe("Additional notes, remarks, or overflow data (extra emails, extra phone numbers, miscellaneous columns)."),
  data_source: z.string().optional().nullable().describe("Lead source. MUST be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. Only use these exact values if the source data clearly matches. Otherwise leave null."),
  possession_time: z.string().optional().nullable().describe("Duration or timestamp of lead ownership."),
  description: z.string().optional().nullable().describe("General description or bio."),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

export const ProcessBatchRequestSchema = z.object({
  batchId: z.string().min(1),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
  provider: z.enum(['groq', 'gemini']).optional().default('groq'),
});
