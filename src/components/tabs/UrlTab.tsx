import { Info, Lock } from "lucide-react";

interface UrlTabProps {
  value: string;
  onChange: (value: string) => void;
  isDynamic?: boolean;
  onToggleDynamic?: (enabled: boolean) => void;
  dynamicLocked?: boolean;
  isUrlTab?: boolean;
  showDynamicToggle?: boolean;
}

export default function UrlTab({
  value,
  onChange,
  isDynamic = false,
  onToggleDynamic,
  dynamicLocked = false,
  isUrlTab = true,
  showDynamicToggle = false,
}: UrlTabProps) {
  const isUrlLike = !value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//");
  const showWarning = value.length > 0 && !isUrlLike;

  const toggleDisabled = !isUrlTab;
  const toggleRowClass = toggleDisabled
    ? "flex items-center gap-3 mt-3 opacity-40 cursor-not-allowed"
    : "flex items-center gap-3 mt-3";

  return (
    <div className="space-y-3">
      <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        Website URL
      </label>
      <input
        id="url-input"
        data-testid="url-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        aria-describedby={showWarning ? "url-warning" : undefined}
      />
      {showWarning && (
        <p id="url-warning" className="text-sm text-amber-600" role="alert">
          This doesn't look like a URL — the QR code will still be generated.
        </p>
      )}

      {showDynamicToggle && (
        <div
          className={toggleRowClass}
          title={toggleDisabled ? "Dynamic QR only works with URL content." : undefined}
        >
          {dynamicLocked ? (
            /* Lock state — user has hit the 3-QR limit */
            <button
              type="button"
              onClick={() => onToggleDynamic?.(true)}
              className="flex items-center justify-center w-11 h-6 rounded-full bg-gray-200 dark:bg-slate-700 cursor-pointer"
              aria-label="Enable Dynamic QR — upgrade required"
              aria-disabled="true"
            >
              <Lock className="w-3.5 h-3.5 text-purple-500" />
            </button>
          ) : (
            /* Normal pill toggle */
            <button
              type="button"
              role="switch"
              aria-checked={isDynamic}
              aria-label="Enable Dynamic QR"
              aria-disabled={toggleDisabled}
              disabled={toggleDisabled}
              onClick={() => !toggleDisabled && onToggleDynamic?.(!isDynamic)}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                isDynamic
                  ? "bg-indigo-600"
                  : "bg-gray-200 dark:bg-slate-700"
              } ${toggleDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                  isDynamic ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          )}

          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Dynamic QR</span>

          {/* Info icon with tooltip */}
          <div className="relative group">
            <Info className="w-4 h-4 text-gray-400 cursor-help" aria-hidden="true" />
            <div
              className="absolute left-1/2 -translate-x-1/2 top-6 z-10 hidden group-hover:block
                          w-56 px-3 py-2 text-xs text-gray-700 dark:text-slate-200
                          bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600
                          rounded-md shadow-lg"
              role="tooltip"
            >
              Destination can be changed after printing without a new QR code.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
