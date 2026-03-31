interface ProgressBarItem {
  label: string;
  scans: number;
  pct: number;  // 0-100, pre-computed by caller
}

interface ProgressBarListProps {
  heading: string;
  items: ProgressBarItem[];
}

export default function ProgressBarList({ heading, items }: ProgressBarListProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{heading}</h2>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">(No data)</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-slate-300 w-28 shrink-0 truncate">{item.label}</span>
              <div
                className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={item.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label}: ${item.pct}%`}
              >
                <div
                  className="h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400 w-20 text-right shrink-0">
                {item.pct}% ({item.scans})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
