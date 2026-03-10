import { forwardRef } from "react";

interface QRPreviewProps {
  isEmpty: boolean;
  isPulsing: boolean;
}

// forwardRef so QRGeneratorIsland can pass the ref for qr-code-styling.append()
const QRPreview = forwardRef<HTMLDivElement, QRPreviewProps>(
  ({ isEmpty, isPulsing }, ref) => {
    return (
      <div
        className="relative w-64 h-64 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100"
      >
        {/* qr-code-styling renders SVG/canvas into this div */}
        {/* data-testid="qr-preview" is on this div so tests find only the QR SVG */}
        {/* IMPORTANT: always in DOM — qr-code-styling needs it mounted */}
        <div
          ref={ref}
          data-testid="qr-preview"
          className={`w-full h-full transition-opacity duration-150 ${
            isPulsing ? "opacity-50 animate-pulse" : "opacity-100"
          }`}
        />

        {/* Ghost placeholder — absolute overlay sibling, always in DOM, opacity toggled */}
        {/* Sibling of qr-preview (not nested inside) so tests don't find ghost SVG via qr-preview */}
        <div
          data-testid="qr-placeholder"
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center bg-white transition-opacity duration-200 ${
            isEmpty ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <GhostQR />
        </div>
      </div>
    );
  }
);

QRPreview.displayName = "QRPreview";
export default QRPreview;

// Hardcoded SVG ghost — three finder-pattern squares + scattered modules
// Communicates the widget's purpose without rendering a real QR from empty string
function GhostQR() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="text-gray-300"
      fill="currentColor"
    >
      {/* Top-left finder pattern */}
      <rect x="10" y="10" width="50" height="50" rx="4" />
      <rect x="18" y="18" width="34" height="34" rx="2" fill="white" />
      <rect x="26" y="26" width="18" height="18" rx="1" />

      {/* Top-right finder pattern */}
      <rect x="140" y="10" width="50" height="50" rx="4" />
      <rect x="148" y="18" width="34" height="34" rx="2" fill="white" />
      <rect x="156" y="26" width="18" height="18" rx="1" />

      {/* Bottom-left finder pattern */}
      <rect x="10" y="140" width="50" height="50" rx="4" />
      <rect x="18" y="148" width="34" height="34" rx="2" fill="white" />
      <rect x="26" y="156" width="18" height="18" rx="1" />

      {/* Scattered data modules */}
      <rect x="76" y="10" width="8" height="8" />
      <rect x="90" y="10" width="8" height="8" />
      <rect x="104" y="18" width="8" height="8" />
      <rect x="76" y="26" width="8" height="8" />
      <rect x="118" y="26" width="8" height="8" />
      <rect x="90" y="34" width="8" height="8" />
      <rect x="104" y="34" width="8" height="8" />
      <rect x="76" y="76" width="8" height="8" />
      <rect x="90" y="76" width="8" height="8" />
      <rect x="118" y="76" width="8" height="8" />
      <rect x="76" y="90" width="8" height="8" />
      <rect x="104" y="90" width="8" height="8" />
      <rect x="118" y="104" width="8" height="8" />
      <rect x="76" y="118" width="8" height="8" />
      <rect x="90" y="118" width="8" height="8" />
      <rect x="140" y="76" width="8" height="8" />
      <rect x="154" y="76" width="8" height="8" />
      <rect x="168" y="76" width="8" height="8" />
      <rect x="140" y="90" width="8" height="8" />
      <rect x="168" y="90" width="8" height="8" />
      <rect x="154" y="104" width="8" height="8" />
      <rect x="140" y="118" width="8" height="8" />
      <rect x="168" y="118" width="8" height="8" />
    </svg>
  );
}
