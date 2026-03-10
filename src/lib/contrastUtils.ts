/**
 * WCAG 2.1 relative luminance and contrast ratio utilities.
 * Source: WCAG 2.1 specification §1.4.3 — stable mathematical formula.
 */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 (no contrast) and 21 (maximum contrast).
 * The result is symmetric: contrastRatio(a, b) === contrastRatio(b, a).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the contrast ratio between fg and bg is below 4.5:1.
 * 4.5:1 is the WCAG AA threshold for normal text.
 */
export function isLowContrast(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) < 4.5;
}
