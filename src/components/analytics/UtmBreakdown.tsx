interface UtmDimension {
  value: string;
  scans: number;
}

interface UtmBreakdownProps {
  utm: {
    sources: UtmDimension[];
    mediums: UtmDimension[];
    campaigns: UtmDimension[];
  };
}

function UtmColumn({
  heading,
  items,
}: {
  heading: string;
  items: UtmDimension[];
}) {
  const maxScans = items.length > 0 ? Math.max(...items.map((i) => i.scans)) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{heading}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">(No data)</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const pct = maxScans > 0 ? Math.round((item.scans / maxScans) * 100) : 0;
            return (
              <li key={item.value} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-slate-300 w-28 shrink-0 truncate">
                  {item.value || '(direct)'}
                </span>
                <div
                  className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.value}: ${pct}%`}
                >
                  <div
                    className="h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400 w-20 text-right shrink-0">
                  {pct}% ({item.scans})
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function UtmBreakdown({ utm }: UtmBreakdownProps) {
  const hasData =
    utm.sources.length > 0 || utm.mediums.length > 0 || utm.campaigns.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">UTM Breakdown</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          No UTM data yet. Add UTM parameters to your destination URLs to track campaign performance.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">UTM Breakdown</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UtmColumn heading="UTM Source" items={utm.sources} />
        <UtmColumn heading="UTM Medium" items={utm.mediums} />
        <UtmColumn heading="UTM Campaign" items={utm.campaigns} />
      </div>
    </div>
  );
}
