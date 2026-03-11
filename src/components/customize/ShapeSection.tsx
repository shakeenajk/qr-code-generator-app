import type { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";

export type ShapeSectionState = {
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
};

export type ShapeSectionProps = {
  value: ShapeSectionState;
  onChange: (next: ShapeSectionState) => void;
};

// ── Inline SVG thumbnails (20×20, currentColor) ──────────────────────────────

const SquareDotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="2" y="2" width="4" height="4" />
    <rect x="8" y="2" width="4" height="4" />
    <rect x="14" y="2" width="4" height="4" />
    <rect x="2" y="8" width="4" height="4" />
    <rect x="8" y="8" width="4" height="4" />
    <rect x="14" y="8" width="4" height="4" />
    <rect x="2" y="14" width="4" height="4" />
    <rect x="8" y="14" width="4" height="4" />
    <rect x="14" y="14" width="4" height="4" />
  </svg>
);

const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="4" r="2" />
    <circle cx="10" cy="4" r="2" />
    <circle cx="16" cy="4" r="2" />
    <circle cx="4" cy="10" r="2" />
    <circle cx="10" cy="10" r="2" />
    <circle cx="16" cy="10" r="2" />
    <circle cx="4" cy="16" r="2" />
    <circle cx="10" cy="16" r="2" />
    <circle cx="16" cy="16" r="2" />
  </svg>
);

const RoundedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="2" y="2" width="4" height="4" rx="1" />
    <rect x="8" y="2" width="4" height="4" rx="1" />
    <rect x="14" y="2" width="4" height="4" rx="1" />
    <rect x="2" y="8" width="4" height="4" rx="1" />
    <rect x="8" y="8" width="4" height="4" rx="1" />
    <rect x="14" y="8" width="4" height="4" rx="1" />
    <rect x="2" y="14" width="4" height="4" rx="1" />
    <rect x="8" y="14" width="4" height="4" rx="1" />
    <rect x="14" y="14" width="4" height="4" rx="1" />
  </svg>
);

const ExtraRoundedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="2" y="2" width="4" height="4" rx="2" />
    <rect x="8" y="2" width="4" height="4" rx="2" />
    <rect x="14" y="2" width="4" height="4" rx="2" />
    <rect x="2" y="8" width="4" height="4" rx="2" />
    <rect x="8" y="8" width="4" height="4" rx="2" />
    <rect x="14" y="8" width="4" height="4" rx="2" />
    <rect x="2" y="14" width="4" height="4" rx="2" />
    <rect x="8" y="14" width="4" height="4" rx="2" />
    <rect x="14" y="14" width="4" height="4" rx="2" />
  </svg>
);

// Classy: 3×3 grid where each cell has a cut corner (top-right triangle notch)
const ClassyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <polygon points="2,2 4,2 6,4 6,6 2,6" />
    <polygon points="8,2 10,2 12,4 12,6 8,6" />
    <polygon points="14,2 16,2 18,4 18,6 14,6" />
    <polygon points="2,8 4,8 6,10 6,12 2,12" />
    <polygon points="8,8 10,8 12,10 12,12 8,12" />
    <polygon points="14,8 16,8 18,10 18,12 14,12" />
    <polygon points="2,14 4,14 6,16 6,18 2,18" />
    <polygon points="8,14 10,14 12,16 12,18 8,18" />
    <polygon points="14,14 16,14 18,16 18,18 14,18" />
  </svg>
);

// Classy-rounded: same cut-corner pattern but with rounded bottom-left corner
const ClassyRoundedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M2,2 L4,2 L6,4 L6,6 Q2,6 2,6 Q2,6 2,2 Z" />
    <path d="M8,2 L10,2 L12,4 L12,6 Q8,6 8,6 Q8,6 8,2 Z" />
    <path d="M14,2 L16,2 L18,4 L18,6 Q14,6 14,6 Q14,6 14,2 Z" />
    <path d="M2,8 L4,8 L6,10 L6,12 Q2,12 2,12 Q2,12 2,8 Z" />
    <path d="M8,8 L10,8 L12,10 L12,12 Q8,12 8,12 Q8,12 8,8 Z" />
    <path d="M14,8 L16,8 L18,10 L18,12 Q14,12 14,12 Q14,12 14,8 Z" />
    <path d="M2,14 L4,14 L6,16 L6,18 Q2,18 2,18 Q2,18 2,14 Z" />
    <path d="M8,14 L10,14 L12,16 L12,18 Q8,18 8,18 Q8,18 8,14 Z" />
    <path d="M14,14 L16,14 L18,16 L18,18 Q14,18 14,18 Q14,18 14,14 Z" />
  </svg>
);

// Corner frame icons (outer square of corner eye)
const FrameSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="2" width="16" height="16" />
  </svg>
);

const FrameExtraRoundedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="2" width="16" height="16" rx="5" />
  </svg>
);

const FrameDotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
  </svg>
);

// Corner pupil icons (inner dot of corner eye)
const PupilSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="5" y="5" width="10" height="10" />
  </svg>
);

const PupilDotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="10" cy="10" r="5" />
  </svg>
);

const PupilExtraRoundedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="5" y="5" width="10" height="10" rx="3" />
  </svg>
);

// ── Shape data arrays ─────────────────────────────────────────────────────────

const DOT_SHAPES: { type: DotType; label: string; icon: React.ReactNode }[] = [
  { type: "square", label: "Square", icon: <SquareDotIcon /> },
  { type: "dots", label: "Dots", icon: <DotsIcon /> },
  { type: "rounded", label: "Rounded", icon: <RoundedIcon /> },
  { type: "extra-rounded", label: "Extra Rounded", icon: <ExtraRoundedIcon /> },
  { type: "classy", label: "Classy", icon: <ClassyIcon /> },
  { type: "classy-rounded", label: "Classy Rounded", icon: <ClassyRoundedIcon /> },
];

const CORNER_FRAMES: { type: CornerSquareType; label: string; icon: React.ReactNode }[] = [
  { type: "square", label: "Square", icon: <FrameSquareIcon /> },
  { type: "extra-rounded", label: "Extra Rounded", icon: <FrameExtraRoundedIcon /> },
  { type: "dot", label: "Dot", icon: <FrameDotIcon /> },
];

const CORNER_PUPILS: { type: CornerDotType; label: string; icon: React.ReactNode }[] = [
  { type: "square", label: "Square", icon: <PupilSquareIcon /> },
  { type: "dot", label: "Dot", icon: <PupilDotIcon /> },
  { type: "extra-rounded", label: "Extra Rounded", icon: <PupilExtraRoundedIcon /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ShapeSection({ value, onChange }: ShapeSectionProps) {
  return (
    <section aria-labelledby="shapes-heading">
      <h3
        id="shapes-heading"
        className="text-sm font-semibold text-gray-900 mb-3 dark:text-white"
      >
        Shapes
      </h3>

      {/* Dot shape grid (CUST-04) */}
      <p className="text-xs text-gray-500 mb-2 dark:text-slate-400">Dot style</p>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {DOT_SHAPES.map(({ type, label, icon }) => (
          <button
            key={type}
            data-testid={`dot-shape-${type}`}
            onClick={() => onChange({ ...value, dotType: type })}
            className={`p-2 rounded-lg border-2 flex items-center justify-center transition-colors ${
              value.dotType === type
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white hover:border-gray-300 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-300"
            }`}
            title={label}
            aria-label={`${label} dot style`}
            aria-pressed={value.dotType === type}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Corner frame row (CUST-05) */}
      <p className="text-xs text-gray-500 mb-2 dark:text-slate-400">Corner frame</p>
      <div className="flex gap-2 mb-4">
        {CORNER_FRAMES.map(({ type, label, icon }) => (
          <button
            key={type}
            data-testid={`corner-frame-${type}`}
            onClick={() => onChange({ ...value, cornerSquareType: type })}
            className={`p-2 rounded-lg border-2 flex items-center justify-center transition-colors ${
              value.cornerSquareType === type
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white hover:border-gray-300 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-300"
            }`}
            title={label}
            aria-label={`${label} corner frame`}
            aria-pressed={value.cornerSquareType === type}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Corner pupil row (CUST-06) */}
      <p className="text-xs text-gray-500 mb-2 dark:text-slate-400">Corner pupil</p>
      <div className="flex gap-2">
        {CORNER_PUPILS.map(({ type, label, icon }) => (
          <button
            key={type}
            data-testid={`corner-pupil-${type}`}
            onClick={() => onChange({ ...value, cornerDotType: type })}
            className={`p-2 rounded-lg border-2 flex items-center justify-center transition-colors ${
              value.cornerDotType === type
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white hover:border-gray-300 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-300"
            }`}
            title={label}
            aria-label={`${label} corner pupil`}
            aria-pressed={value.cornerDotType === type}
          >
            {icon}
          </button>
        ))}
      </div>
    </section>
  );
}
