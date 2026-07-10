import { CrmRecord } from './src/validation/schema';

// Mock function
function normalizeAndValidate(record: any): any {
  const norm = { ...record };

  if (norm.email) {
    const trimmed = norm.email.trim().toLowerCase();
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
      norm.email = trimmed;
    } else {
      norm.email = null;
    }
  }

  if (norm.mobile_without_country_code) {
    let phoneStr = String(norm.mobile_without_country_code).trim();
    const parts = phoneStr.split(/[/|,]/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      phoneStr = parts[0];
      const extra = parts.slice(1);
      norm.crm_note = norm.crm_note ? norm.crm_note + ' | Extra phones: ' + extra.join(', ') : 'Extra phones: ' + extra.join(', ');
    }
    
    if (phoneStr.startsWith('00')) {
      phoneStr = '+' + phoneStr.slice(2);
    }

    let countryMatch = phoneStr.match(/^(\+\d{1,4})[\s-]*(.*)$/);
    if (!countryMatch) {
      countryMatch = phoneStr.match(/^(\d{1,2})[\s-]+(\d[\d\s-]{4,})$/);
    }
    if (!countryMatch) {
      const pureDigits = phoneStr.replace(/[^\d]/g, '');
      if (pureDigits.length === 12 && pureDigits.startsWith('91')) {
        countryMatch = [phoneStr, '91', pureDigits.slice(2)];
      } else if (pureDigits.length === 12 && pureDigits.startsWith('44')) {
        countryMatch = [phoneStr, '44', pureDigits.slice(2)];
      } else if (pureDigits.length === 11 && pureDigits.startsWith('1')) {
        countryMatch = [phoneStr, '1', pureDigits.slice(1)];
      } else if (pureDigits.length === 11 && pureDigits.startsWith('61')) {
        countryMatch = [phoneStr, '61', pureDigits.slice(2)];
      }
    }
    if (countryMatch) {
      if (!norm.country_code) {
        norm.country_code = countryMatch[1].startsWith('+') ? countryMatch[1] : '+' + countryMatch[1];
      }
      phoneStr = countryMatch[2];
    }
    
    const stripped = phoneStr.replace(/[^\d]/g, '');
    const digitCount = stripped.length;
    if (digitCount < 5) {
      norm.mobile_without_country_code = null;
    } else {
      norm.mobile_without_country_code = stripped;
    }
  }
  return norm;
}

const tests = [
  "+91-99257-09879 ext 601",
  "+1 (461) 555-9723",
  "9151125383 / 9309985248",
  "+91 9215360708",
  "+1 (514) 555-2429",
  "9723496122 / 9438972770",
  "0091-9687887655",
  "+91-905...",
  "92803 66864",
  "919925709879601"
];

for (const t of tests) {
  const norm = normalizeAndValidate({ mobile_without_country_code: t });
  console.log(`Input: ${t.padEnd(25)} -> Output: ${JSON.stringify(norm)}`);
}
