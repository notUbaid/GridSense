import { CrmRecord } from '../validation/schema';

/**
 * MockAIProvider implements deterministic responses for automated integration tests,
 * bypassing the real Groq API to save credits, ensure speed, and guarantee test stability.
 */
export class MockAIProvider {
  /**
   * Deterministically returns CRM records based on the input rows.
   */
  static async extract(headers: string[], rows: Record<string, string>[]): Promise<CrmRecord[]> {
    // Artificial small delay to simulate network/AI processing for timing tests
    await new Promise((resolve) => setTimeout(resolve, 50));

    return rows.map((row, index) => {
      // Very basic mock heuristic to simulate AI mapping for tests
      const hasEmail = !!(row.Email || row['Email Address'] || row.email);
      const hasPhone = !!(row.Phone || row['Phone Number'] || row.mobile);

      // Return a predictable schema record
      return {
        created_at: new Date().toISOString(),
        name: row.Name || row['First Name'] || `Test User ${index}`,
        email: hasEmail ? (row.Email || row['Email Address'] || row.email) : null,
        mobile_without_country_code: hasPhone ? (row.Phone || row['Phone Number'] || row.mobile) : null,
        company: row.Company || row.Org || null,
        city: 'Mock City',
        state: 'Mock State',
        country: 'Mock Country',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: 'Extracted by MockAIProvider',
        data_source: null,
      } as CrmRecord;
    });
  }
}
