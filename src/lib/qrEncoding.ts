// WiFi QR encoding — WIFI: format per ZXing spec
// Special characters \, ;, ,, ", : must be backslash-escaped
export interface WifiState {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
}

export interface VCardState {
  name: string;
  phone: string;
  email: string;
  org: string;
  // New fields (VCARD-01)
  title?: string;
  company?: string;
  workPhone?: string;
  address?: string;
  website?: string;
  linkedin?: string;
}

function escapeWifi(s: string): string {
  return s.replace(/([\\;,":])/g, "\\$1");
}

export function encodeWifi(state: WifiState): string {
  const { ssid, password, security } = state;
  const p = security === "nopass" ? "" : `;P:${escapeWifi(password)}`;
  return `WIFI:T:${security};S:${escapeWifi(ssid)}${p};;`;
}

/**
 * Escapes special characters in a vCard 3.0 property value per RFC 6350.
 * Escapes: backslash, semicolon, comma, newline.
 */
export function escapeVCard(s: string): string {
  return s
    .replace(/\\/g, '\\\\')   // backslash first (must be first to avoid double-escaping)
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds a vCard line per RFC 6350 section 3.2:
 * lines MUST NOT exceed 75 octets (bytes), folded with CRLF + single space.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const segments: string[] = [];
  let remaining = line;
  while (encoder.encode(remaining).length > 75) {
    // Find split point at 75-byte boundary without splitting a multi-byte char
    let byteCount = 0;
    let charIndex = 0;
    while (charIndex < remaining.length) {
      const charBytes = encoder.encode(remaining[charIndex]).length;
      if (byteCount + charBytes > 75) break;
      byteCount += charBytes;
      charIndex++;
    }
    segments.push(remaining.slice(0, charIndex));
    remaining = remaining.slice(charIndex);
  }
  if (remaining.length > 0) segments.push(remaining);
  return segments.join('\r\n ');
}

// vCard 3.0 encoding — uses CRLF line endings per RFC 6350 for maximum compatibility
export function encodeVCard(state: VCardState): string {
  const { name, phone, email, org, title, company, workPhone, address, website, linkedin } = state;
  const e = escapeVCard;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    foldLine(`FN:${e(name)}`),
    foldLine(`N:${e(name)};;;`),
  ];
  if (org?.trim())       lines.push(foldLine(`ORG:${e(org)}`));
  if (title?.trim())     lines.push(foldLine(`TITLE:${e(title)}`));
  if (company?.trim())   lines.push(foldLine(`ORG;TYPE=work:${e(company)}`));
  if (phone?.trim())     lines.push(foldLine(`TEL:${e(phone)}`));
  if (workPhone?.trim()) lines.push(foldLine(`TEL;TYPE=work:${e(workPhone)}`));
  if (email?.trim())     lines.push(foldLine(`EMAIL:${e(email)}`));
  if (address?.trim())   lines.push(foldLine(`ADR;TYPE=work:;;${e(address)};;;;`));
  if (website?.trim())   lines.push(foldLine(`URL:${e(website)}`));
  if (linkedin?.trim())  lines.push(foldLine(`X-SOCIALPROFILE;TYPE=linkedin:${e(linkedin)}`));
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

// Determines whether to show ghost placeholder vs. real QR
export function isContentEmpty(data: string): boolean {
  return !data.trim();
}

// Pre-encoding emptiness checks for structured tab types
// SSID is the canonical required field for WiFi — blank SSID = no scannable QR
export function isWifiEmpty(state: WifiState): boolean {
  return !state.ssid.trim();
}

// vCard: any non-blank field produces a meaningful QR — all blank = empty
export function isVCardEmpty(state: VCardState): boolean {
  return (
    !state.name.trim() &&
    !state.phone.trim() &&
    !state.email.trim() &&
    !state.org.trim() &&
    !(state.title?.trim()) &&
    !(state.company?.trim()) &&
    !(state.workPhone?.trim()) &&
    !(state.address?.trim()) &&
    !(state.website?.trim()) &&
    !(state.linkedin?.trim())
  );
}
