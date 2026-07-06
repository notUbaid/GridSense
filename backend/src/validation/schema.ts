import { z } from 'zod';

export const CrmRecordSchema = z.object({
  created_at: z.string().datetime().optional().nullable().describe("ISO-8601 formatted date string representing when the record was created. Leave null if not available."),
  name: z.string().optional().nullable().describe("Full name of the contact. Combine first and last name if separate."),
  email: z.string().email().optional().nullable().or(z.literal('')).describe("Valid email address of the contact."),
  country_code: z.string().optional().nullable().describe("Country code for the mobile number (e.g., +1, +44, +91). If a phone number is provided without a country code, infer it if a country is provided, else leave null."),
  mobile_without_country_code: z.string().optional().nullable().describe("Mobile number excluding the country code. Remove all spaces and formatting."),
  company: z.string().optional().nullable().describe("Name of the company the contact works for."),
  city: z.string().optional().nullable().describe("City of residence or work."),
  state: z.string().optional().nullable().describe("State or province of residence or work."),
  country: z.string().optional().nullable().describe("Country of residence or work."),
  lead_owner: z.string().optional().nullable().describe("Name or email of the person who owns this lead."),
  crm_status: z.string().optional().nullable().describe("Current status in the CRM (e.g., New, Contacted, Qualified, Lost)."),
  crm_note: z.string().optional().nullable().describe("Any additional notes, context, or comments regarding this lead. Combine miscellaneous unmapped column data here if it seems relevant."),
  data_source: z.string().optional().nullable().describe("The source from which this lead was acquired (e.g., Facebook, Google Ads, Manual)."),
  possession_time: z.string().optional().nullable().describe("Duration or timestamp indicating how long the lead has been owned or time in possession."),
  description: z.string().optional().nullable().describe("General description or bio of the contact or lead."),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

export const ProcessBatchRequestSchema = z.object({
  batchId: z.string().min(1),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
});
