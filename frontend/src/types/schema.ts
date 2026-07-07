import { z } from 'zod';

export const CrmRecordSchema = z.object({
  created_at: z.string().datetime().optional().nullable(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal('')),
  country_code: z.string().optional().nullable(),
  phone_local: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  lead_owner: z.string().optional().nullable(),
  crm_status: z.string().optional().nullable(),
  crm_note: z.string().optional().nullable(),
  data_source: z.string().optional().nullable(),
  possession_time: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

export const ProcessBatchRequestSchema = z.object({
  batchId: z.string().min(1),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
  provider: z.enum(['groq', 'gemini']).optional().default('groq'),
});

export type ProcessBatchRequest = z.infer<typeof ProcessBatchRequestSchema>;

export const ProcessBatchResponseSchema = z.object({
  batchId: z.string(),
  status: z.enum(['success', 'partial', 'error']),
  records: z.array(CrmRecordSchema).optional(),
  skippedCount: z.number().default(0),
  error: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

export type ProcessBatchResponse = z.infer<typeof ProcessBatchResponseSchema>;
