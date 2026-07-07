import { describe, it, expect } from 'vitest';
import { processBatch } from '../lib/extractor';

describe('Extractor', () => {
  it('should process a batch of records successfully using the MockProvider', async () => {
    const headers = ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Company'];
    const rows = [
      { 'First Name': 'John', 'Last Name': 'Doe', 'Email Address': 'john@example.com', 'Phone Number': '555-1234', Company: 'Acme Corp' },
      { 'First Name': 'Jane', 'Last Name': 'Smith', 'Email Address': '', 'Phone Number': '555-5678', Company: 'Tech Inc' },
    ];

    const result = await processBatch(headers, rows);

    expect(result.skippedCount).toBe(0);
    expect(result.records).toHaveLength(2);
    
    // First record has email
    expect(result.records[0].email).toBe('john@example.com');
    expect(result.records[0].mobile_without_country_code).toBe('5551234');
    expect(result.records[0].name).toBe('John');
    
    // Second record has no email, but has phone
    expect(result.records[1].email).toBeNull();
    expect(result.records[1].mobile_without_country_code).toBe('5555678');
  });

  it('should skip records that have neither email nor phone number', async () => {
    const headers = ['Name', 'Email Address', 'Phone Number'];
    const rows = [
      { Name: 'Valid User', 'Email Address': 'valid@example.com', 'Phone Number': '' },
      { Name: 'Invalid User', 'Email Address': '', 'Phone Number': '' }, // No email, no phone
    ];

    const result = await processBatch(headers, rows);

    expect(result.skippedCount).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].name).toBe('Valid User');
  });
});
