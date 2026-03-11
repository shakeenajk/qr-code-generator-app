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
}

function escapeWifi(s: string): string {
  return s.replace(/([\\;,":])/g, "\\$1");
}

export function encodeWifi(state: WifiState): string {
  const { ssid, password, security } = state;
  const p = security === "nopass" ? "" : `;P:${escapeWifi(password)}`;
  return `WIFI:T:${security};S:${escapeWifi(ssid)}${p};;`;
}

// vCard 3.0 encoding — uses CRLF line endings per RFC 6350 for maximum compatibility
export function encodeVCard(state: VCardState): string {
  const { name, phone, email, org } = state;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `N:${name};;;`,
  ];
  if (org.trim())   lines.push(`ORG:${org}`);
  if (phone.trim()) lines.push(`TEL:${phone}`);
  if (email.trim()) lines.push(`EMAIL:${email}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
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
    !state.org.trim()
  );
}
