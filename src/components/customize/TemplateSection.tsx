import type { TemplatePreset } from "../../types/frames";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "../../data/templateData";

export type TemplateSectionProps = {
  selectedId: string | null;
  onApply: (preset: TemplatePreset) => void;
};

// Minimal QR grid illustration used as placeholder thumbnail inside each card
// Shows a stylized 5×5 QR code pattern in the preset's actual dot + bg colors
function QRThumbnailIcon({ dotColor, bgColor }: { dotColor: string; bgColor: string }) {
  // Simple 5-module QR pattern illustration
  const modules = [
    [1, 1, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1],
    [1, 0, 1, 1, 0],
  ];
  const size = 60;
  const cellSize = size / 5;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ borderRadius: 4 }}
    >
      <rect width={size} height={size} fill={bgColor} />
      {modules.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize + 1}
              y={y * cellSize + 1}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={dotColor}
              rx={2}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function TemplateSection({ selectedId, onApply }: TemplateSectionProps) {
  return (
    <section aria-labelledby="template-heading">
      <h3
        id="template-heading"
        className="text-sm font-bold text-gray-900 dark:text-white"
      >
        Start from a Template
      </h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
        Apply a full style preset in one click.
      </p>

      {TEMPLATE_CATEGORIES.map((category) => {
        const categoryPresets = TEMPLATES.filter((t) => t.category === category);
        return (
          <div key={category} className="mb-4">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{category}</p>
            <div className="flex flex-wrap gap-2">
              {categoryPresets.map((preset) => {
                const isSelected = selectedId === preset.id;
                return (
                  <button
                    key={preset.id}
                    data-testid={`template-card-${preset.id}`}
                    onClick={() => onApply(preset)}
                    style={{ width: 80, minHeight: 96 }}
                    className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-1 border-transparent"
                        : "border border-gray-200 hover:border-gray-400 dark:border-slate-600 dark:hover:border-slate-400"
                    }`}
                    title={preset.name}
                    aria-label={`Apply ${preset.name} template`}
                    aria-pressed={isSelected}
                  >
                    {/* Thumbnail — miniature QR illustration in preset colors */}
                    <div className="rounded-md overflow-hidden mb-1">
                      <QRThumbnailIcon dotColor={preset.dotColor} bgColor={preset.bgColor} />
                    </div>
                    {/* Name label — max 2 lines, truncated */}
                    <span
                      className="text-sm font-normal text-gray-600 dark:text-slate-400 text-center mt-1 leading-tight w-full"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
