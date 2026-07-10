const { z } = require('zod');

const CrmRecordSchema = z.object({
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
  crm_status: z.enum(['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE']).optional().nullable(),
  crm_note: z.string().optional().nullable(),
  data_source: z.enum(['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots']).optional().nullable(),
  possession_time: z.string().optional().nullable(),
  _row_id: z.string().optional(),
  description: z.string().optional().nullable(),
});

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

const data = {
  records: [
    {
      name: "John Doe",
      email: "john@example.com", // EXTRA KEY
      mobile_without_country_code: "1234567890", // EXTRA KEY
      crm_note: "Test"
    }
  ]
};

const result = llmResponseSchema.safeParse(data);
console.log("Success?", result.success);
if (!result.success) {
  console.log("Error:", result.error.format());
} else {
  console.log("Data:", result.data);
}
