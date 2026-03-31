import type { FrameDefinition, FrameType } from "../types/frames";

export const DEFAULT_CTA_TEXT: Record<Exclude<FrameType, "none">, string> = {
  "simple-border":  "Scan Me",
  "rounded-border": "Scan Me",
  "top-bottom":     "Scan Me",
  "bottom-banner":  "Scan Here",
  "badge":          "Scan Me",
  "shopping-bag":   "Order Here",
  "clipboard":      "See Menu",
};

export const FRAMES: FrameDefinition[] = [
  {
    id: "none",
    label: "No Frame",
    defaultCta: "",
    svgPath: "", // empty — "No Frame" tile renders a plain QR square icon instead
  },
  {
    id: "simple-border",
    label: "Simple Border",
    defaultCta: DEFAULT_CTA_TEXT["simple-border"],
    // 32×32 icon: thin rect border + bottom text strip
    svgPath: "M2 2h28v28H2z M2 24h28", // outer rect + bottom divider line (stroke icon)
  },
  {
    id: "rounded-border",
    label: "Rounded Border",
    defaultCta: DEFAULT_CTA_TEXT["rounded-border"],
    svgPath: "M4 2h24a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M2 24h28",
  },
  {
    id: "top-bottom",
    label: "Top & Bottom",
    defaultCta: DEFAULT_CTA_TEXT["top-bottom"],
    svgPath: "M2 2h28v6H2z M2 24h28v6H2z", // top banner + bottom banner
  },
  {
    id: "bottom-banner",
    label: "Bottom Banner",
    defaultCta: DEFAULT_CTA_TEXT["bottom-banner"],
    svgPath: "M2 20h28v10H2z", // wide bottom banner
  },
  {
    id: "badge",
    label: "Badge",
    defaultCta: DEFAULT_CTA_TEXT["badge"],
    svgPath: "M16 2a14 14 0 1 1 0 28A14 14 0 0 1 16 2z", // circle outline
  },
  {
    id: "shopping-bag",
    label: "Shopping Bag",
    defaultCta: DEFAULT_CTA_TEXT["shopping-bag"],
    // Bag silhouette: rectangle with handle arcs at top
    svgPath: "M10 8a6 6 0 0 1 12 0M4 10h24l-2 18H6L4 10z",
  },
  {
    id: "clipboard",
    label: "Clipboard",
    defaultCta: DEFAULT_CTA_TEXT["clipboard"],
    // Clipboard: rect body + top clip bar
    svgPath: "M10 2h12v4H10z M6 6h20v24H6z",
  },
];
