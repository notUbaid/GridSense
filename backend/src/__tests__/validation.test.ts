import { describe, it, expect } from 'vitest';
import { CrmRecordSchema } from '../validation/schema';

describe('Zod Validation Edge Cases', () => {
  it('should enforce enum constraints for crm_status', () => {
    const invalidRecord = {
      created_at: new Date().toISOString(),
      name: 'John Doe',
      crm_status: 'INVALID_STATUS', // Not in enum
      data_source: null
    };

    const result = CrmRecordSchema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid option');
    }
  });

  it('should enforce enum constraints for data_source', () => {
    const invalidRecord = {
      name: 'Jane Doe',
      data_source: 'random_source' // Not in enum
    };

    const result = CrmRecordSchema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
  });

  it('should enforce string formatting and nullability', () => {
    const validRecord = {
      created_at: new Date().toISOString(),
      name: 'Jane Doe',
      email: 'jane@example.com',
      mobile_without_country_code: '555-9876',
      lead_owner: null,
      crm_status: 'DID_NOT_CONNECT',
      data_source: 'leads_on_demand'
    };

    const result = CrmRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });
});
