interface UrlTabProps {
  value: string;
  onChange: (value: string) => void;
}

export default function UrlTab({ value, onChange }: UrlTabProps) {
  const isUrlLike = !value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//");
  const showWarning = value.length > 0 && !isUrlLike;

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
    </div>
  );
}
