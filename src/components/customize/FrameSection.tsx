import type { FrameSectionState, FrameType } from "../../types/frames";
import { FRAMES } from "../../data/frameData";

export type FrameSectionProps = {
  value: FrameSectionState;
  onChange: (next: FrameSectionState) => void;
};

// Inline SVG icon for the "No Frame" tile — dashed QR grid illustration
const NoFrameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="4" width="24" height="24" strokeDasharray="4 2" />
    <rect x="9" y="9" width="14" height="14" />
  </svg>
);

// Generic frame icon — renders the svgPath from FRAMES as a stroke path
function FrameIcon({ svgPath }: { svgPath: string }) {
  if (!svgPath) return <NoFrameIcon />;
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={svgPath} />
    </svg>
  );
}

export function FrameSection({ value, onChange }: FrameSectionProps) {
  const handleFrameSelect = (frameType: FrameType) => {
    // When selecting a frame, reset frameText to the frame's default CTA (D-04)
    const frameDef = FRAMES.find((f) => f.id === frameType);
    onChange({
      frameType,
      frameText: frameDef?.defaultCta ?? "",
    });
  };

  const handleTextChange = (text: string) => {
    onChange({ ...value, frameText: text });
  };

  const charCount = value.frameText.length;

  return (
    <section aria-labelledby="frame-heading">
      <h3
        id="frame-heading"
        className="text-sm font-bold text-gray-900 dark:text-white mb-3"
      >
        Frame
      </h3>

      {/* Frame tile grid — 4 columns per UI-SPEC */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {FRAMES.map((frame) => (
          <button
            key={frame.id}
            data-testid={`frame-tile-${frame.id}`}
            onClick={() => handleFrameSelect(frame.id as FrameType)}
            className={`w-full p-2 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
              value.frameType === frame.id
                ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                : "border-gray-200 bg-white hover:border-gray-300 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-300"
            }`}
            title={frame.label}
            aria-label={`${frame.label} frame`}
            aria-pressed={value.frameType === frame.id}
          >
            <FrameIcon svgPath={frame.svgPath} />
            <span className="text-xs leading-tight text-center">{frame.label}</span>
          </button>
        ))}
      </div>

      {/* CTA text input — only shown when a frame is active (D-06) */}
      {value.frameType !== "none" && (
        <div className="mt-4">
          <label
            htmlFor="frame-cta-text"
            className="block text-sm font-normal text-gray-700 dark:text-slate-300 mb-1"
          >
            CTA Text
          </label>
          <input
            id="frame-cta-text"
            data-testid="frame-cta-input"
            type="text"
            value={value.frameText}
            onChange={(e) => handleTextChange(e.target.value)}
            maxLength={30}
            placeholder={value.frameText || "Scan Me"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
          />
          {/* Character counter */}
          <p className="text-sm text-gray-400 text-right mt-1" aria-live="polite">
            {charCount}/30
          </p>
        </div>
      )}
    </section>
  );
}
