import { isLowContrast } from "../../lib/contrastUtils";

export type ColorSectionState = {
  dotColor: string;          // hex, default "#1e293b"
  bgColor: string;           // hex, default "#ffffff"
  gradientEnabled: boolean;  // default false
  gradientType: "linear" | "radial"; // default "linear"
  gradientStop1: string;     // hex, default "#1e293b"
  gradientStop2: string;     // hex, default "#4f46e5"
};

export type ColorSectionProps = {
  value: ColorSectionState;
  onChange: (next: ColorSectionState) => void;
};

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-gray-700 w-24 dark:text-slate-300">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-slate-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
        }}
        maxLength={7}
        className="w-24 font-mono text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
      />
    </label>
  );
}

export function ColorSection({ value, onChange }: ColorSectionProps) {
  // When gradient is enabled, use gradientStop1 as the representative foreground color for contrast check
  const effectiveFg = value.gradientEnabled ? value.gradientStop1 : value.dotColor;
  const showWarning = isLowContrast(effectiveFg, value.bgColor);

  return (
    <section aria-labelledby="colors-heading">
      <h3 id="colors-heading" className="text-sm font-semibold text-gray-900 mb-3 dark:text-white">
        Colors
      </h3>

      {/* Foreground color picker (CUST-01) */}
      <div data-testid="color-fg">
        <ColorPicker
          label="Dots"
          value={value.dotColor}
          onChange={(hex) => onChange({ ...value, dotColor: hex })}
        />
      </div>

      {/* Background color picker (CUST-02) */}
      <div data-testid="color-bg" className="mt-2">
        <ColorPicker
          label="Background"
          value={value.bgColor}
          onChange={(hex) => onChange({ ...value, bgColor: hex })}
        />
      </div>

      {/* Low-contrast warning (CUST-07) — non-blocking, inline */}
      {showWarning && (
        <div
          data-testid="low-contrast-warning"
          role="alert"
          className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2"
        >
          Low contrast — QR may not scan reliably
        </div>
      )}

      {/* Gradient controls (CUST-03) */}
      <div className="mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            data-testid="gradient-toggle"
            checked={value.gradientEnabled}
            onChange={(e) => onChange({ ...value, gradientEnabled: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">Enable gradient</span>
        </label>

        {value.gradientEnabled && (
          <div className="mt-3 space-y-2 pl-6">
            <select
              data-testid="gradient-type"
              value={value.gradientType}
              onChange={(e) =>
                onChange({
                  ...value,
                  gradientType: e.target.value as "linear" | "radial",
                })
              }
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>

            <ColorPicker
              label="Color stop 1"
              value={value.gradientStop1}
              onChange={(hex) => onChange({ ...value, gradientStop1: hex })}
            />
            <ColorPicker
              label="Color stop 2"
              value={value.gradientStop2}
              onChange={(hex) => onChange({ ...value, gradientStop2: hex })}
            />
          </div>
        )}
      </div>
    </section>
  );
}
