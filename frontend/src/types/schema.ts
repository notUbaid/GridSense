import { z } from 'zod';

export const CrmRecordSchema = z.object({
  created_at: z.string().datetime().optional().nullable(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal('')),
  country_code: z.string().optional().nullable(),
  mobile_without_country_code: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  lead_owner: z.string().optional().nullable(),
  crm_status: z.string().optional().nullable(),
  crm_note: z.string().optional().nullable(),
  data_source: z.string().optional().nullable(),
  possession_time: z.string().optional().nullable(),
  _row_id: z.string().optional(),
  description: z.string().optional().nullable(),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

export const ProcessBatchRequestSchema = z.object({
  batchId: z.string().min(1),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
  provider: z.enum(['groq', 'gemini']).optional().default('groq'),
  schemaMapping: z.array(z.object({
    source: z.string(),
    target: z.string().optional().nullable(),
    confidence: z.any().optional()
  })).optional().nullable()
});

export type ProcessBatchRequest = z.infer<typeof ProcessBatchRequestSchema>;

export const ProcessBatchResponseSchema = z.object({
  batchId: z.string(),
  status: z.enum(['success', 'partial', 'error']),
  records: z.array(CrmRecordSchema).optional(),
  skippedCount: z.number().default(0),
  skippedReasons: z.record(z.string(), z.number()).optional(),
  skippedRecords: z.array(z.object({
    original: z.record(z.string(), z.string()),
    reason: z.string()
  })).optional(),
  error: z.string().optional(),
  exhaustedProvider: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

export type ProcessBatchResponse = z.infer<typeof ProcessBatchResponseSchema>;
