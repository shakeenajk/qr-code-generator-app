import type { DotType, CornerSquareType } from "qr-code-styling";

// The 8 frame IDs defined in the UI-SPEC
export type FrameType =
  | "none"
  | "simple-border"
  | "rounded-border"
  | "top-bottom"
  | "bottom-banner"
  | "badge"
  | "shopping-bag"
  | "clipboard";

// State slice held in QRGeneratorIsland (added in Plan 03)
export interface FrameSectionState {
  frameType: FrameType;
  frameText: string;
}

// Config object passed from ExportButtons → composeQRWithFrame
export interface FrameConfig {
  frameType: FrameType;
  frameText: string;
  frameColor: string; // follows QR foreground color (D-10)
  bgColor: string;    // from ColorSectionState.bgColor
}

// One entry in FRAMES array
export interface FrameDefinition {
  id: FrameType;
  label: string;
  defaultCta: string;        // default CTA text shown in input (D-04)
  svgPath: string;           // inline SVG path data for 32×32 tile icon (currentColor)
}

// One entry in TEMPLATES array
export interface TemplatePreset {
  id: string;
  name: string;
  category: "Minimal" | "Bold" | "Business" | "Vibrant" | "Christmas" | "Halloween" | "Valentine's Day" | "Easter" | "Black Friday" | "Summer" | "Back to School";
  frameType: FrameType;
  dotColor: string;
  bgColor: string;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  frameText: string; // CTA text to apply when template selected
}
