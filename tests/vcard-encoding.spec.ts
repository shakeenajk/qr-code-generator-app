/**
 * vCard encoding unit tests — VCARD-01, VCARD-02
 * Tests escapeVCard, foldLine, extended VCardState, and updated encodeVCard.
 */
import { test, expect } from '@playwright/test';
import {
  escapeVCard,
  foldLine,
  encodeVCard,
  isVCardEmpty,
} from '../src/lib/qrEncoding';

test.describe('escapeVCard', () => {
  test('no-op on plain string', () => {
    expect(escapeVCard('hello')).toBe('hello');
  });

  test('escapes semicolons', () => {
    expect(escapeVCard('semi;colon')).toBe('semi\\;colon');
  });

  test('escapes commas', () => {
    expect(escapeVCard('com,ma')).toBe('com\\,ma');
  });

  test('escapes backslashes (first, to avoid double-escaping)', () => {
    expect(escapeVCard('back\\slash')).toBe('back\\\\slash');
  });

  test('escapes newlines', () => {
    expect(escapeVCard('new\nline')).toBe('new\\nline');
  });
});

test.describe('foldLine', () => {
  test('short line returned unchanged', () => {
    expect(foldLine('SHORT')).toBe('SHORT');
  });

  test('80-byte ASCII line is folded with CRLF+space', () => {
    const longLine = 'FN:' + 'A'.repeat(77); // 80 chars total
    const result = foldLine(longLine);
    expect(result).toContain('\r\n ');
    // Each segment (after trimming folding whitespace) is <=75 bytes
    const segments = result.split('\r\n ');
    for (const seg of segments) {
      expect(new TextEncoder().encode(seg).length).toBeLessThanOrEqual(75);
    }
  });

  test('exactly 75-byte line is NOT folded', () => {
    const line = 'A'.repeat(75);
    expect(foldLine(line)).toBe(line);
    expect(foldLine(line)).not.toContain('\r\n');
  });
});

test.describe('encodeVCard', () => {
  const base = { name: '', phone: '', email: '', org: '' };

  test('semicolon in name is escaped in FN line', () => {
    const result = encodeVCard({ ...base, name: "O'Brien;Jr" });
    expect(result).toContain("FN:O'Brien\\;Jr");
  });

  test('comma in org is escaped', () => {
    const result = encodeVCard({ ...base, name: 'Test', org: 'Test,Inc' });
    expect(result).toContain('ORG:Test\\,Inc');
  });

  test('title field produces TITLE line', () => {
    const result = encodeVCard({ ...base, name: 'Test', title: 'CEO' });
    expect(result).toContain('TITLE:CEO');
  });

  test('workPhone field produces TEL;TYPE=work line', () => {
    const result = encodeVCard({ ...base, name: 'Test', workPhone: '+1 555 0001' });
    expect(result).toContain('TEL;TYPE=work:+1 555 0001');
  });

  test('address field produces ADR;TYPE=work line', () => {
    const result = encodeVCard({ ...base, name: 'Test', address: '123 Main St' });
    expect(result).toContain('ADR;TYPE=work:;;123 Main St');
  });

  test('website field produces URL line', () => {
    const result = encodeVCard({ ...base, name: 'Test', website: 'https://example.com' });
    expect(result).toContain('URL:https://example.com');
  });

  test('linkedin field produces X-SOCIALPROFILE line', () => {
    const result = encodeVCard({ ...base, name: 'Test', linkedin: 'https://linkedin.com/in/user' });
    expect(result).toContain('X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/user');
  });

  test('empty optional fields produce no extra lines', () => {
    const result = encodeVCard({ ...base, name: 'Test', title: '', workPhone: '  ' });
    expect(result).not.toContain('TITLE:');
    expect(result).not.toContain('TEL;TYPE=work:');
  });

  test('result is CRLF-delimited and has BEGIN/END wrappers', () => {
    const result = encodeVCard({ ...base, name: 'Test' });
    expect(result).toMatch(/^BEGIN:VCARD\r\n/);
    expect(result).toMatch(/END:VCARD$/);
  });
});

test.describe('isVCardEmpty', () => {
  test('all blank fields = empty', () => {
    expect(isVCardEmpty({ name: '', phone: '', email: '', org: '' })).toBe(true);
  });

  test('non-blank title = not empty', () => {
    expect(isVCardEmpty({ name: '', phone: '', email: '', org: '', title: 'CEO' })).toBe(false);
  });

  test('non-blank linkedin = not empty', () => {
    expect(isVCardEmpty({ name: '', phone: '', email: '', org: '', linkedin: 'https://li.com' })).toBe(false);
  });

  test('non-blank name = not empty', () => {
    expect(isVCardEmpty({ name: 'Jane', phone: '', email: '', org: '' })).toBe(false);
  });
});
