import { useState, useEffect, useCallback } from 'react';
import ScanChart from './ScanChart';
import ProgressBarList from './ProgressBarList';
import DateRangePicker from './DateRangePicker';
import UtmBreakdown from './UtmBreakdown';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', IN: 'India', BR: 'Brazil', MX: 'Mexico',
  JP: 'Japan', KR: 'South Korea', CN: 'China', SG: 'Singapore', NL: 'Netherlands',
};

interface AnalyticsData {
  name: string;
  slug: string;
  total: number;
  unique: number;
  timeSeries: { date: string; scans: number }[];
  devices: { device: string; scans: number }[];
  countries: { country: string; scans: number }[];
  utm: {
    sources: { value: string; scans: number }[];
    mediums: { value: string; scans: number }[];
    campaigns: { value: string; scans: number }[];
  };
}

interface AnalyticsDashboardProps {
  slug: string;
  name?: string;
  initialFrom?: number;
  initialTo?: number;
}

function toPct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Date range picker skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-3">
          <div className="h-7 w-40 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-7 w-40 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({
  slug,
  name,
  initialFrom,
  initialTo,
}: AnalyticsDashboardProps) {
  const defaultTo = Math.floor(Date.now() / 1000);
  const defaultFrom = defaultTo - 30 * 24 * 60 * 60;

  const [from, setFrom] = useState(initialFrom ?? defaultFrom);
  const [to, setTo] = useState(initialTo ?? defaultTo);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(
    async (fromSec: number, toSec: number) => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/analytics/${slug}?from=${fromSec}&to=${toSec}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    fetchData(from, to);
  }, [fetchData, from, to]);

  function handleRangeChange(newFrom: number, newTo: number) {
    setFrom(newFrom);
    setTo(newTo);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/${slug}/export?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scans-${slug}-${from}-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user can retry
    } finally {
      setExporting(false);
    }
  }

  const deviceItems = data
    ? data.devices.map((d) => ({
        label:
          d.device === 'ios'
            ? 'iOS'
            : d.device === 'android'
            ? 'Android'
            : d.device === 'desktop'
            ? 'Desktop'
            : 'Other',
        scans: d.scans,
        pct: toPct(d.scans, data.total),
      }))
    : [];

  const countryItems = data
    ? data.countries.map((c) => {
        const code = c.country === 'unknown' || !c.country ? null : c.country.toUpperCase();
        const label = code
          ? COUNTRY_NAMES[code]
            ? `${code} — ${COUNTRY_NAMES[code]}`
            : code
          : 'Unknown';
        return { label, scans: c.scans, pct: toPct(c.scans, data.total) };
      })
    : [];

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-base font-semibold text-red-600 dark:text-red-400">Could not load analytics</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Something went wrong fetching your scan data. Try refreshing the page.
        </p>
        <button
          type="button"
          onClick={() => fetchData(from, to)}
          className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Analytics: {data.name || name}
        </h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{data.slug}</p>
      </div>

      {/* Date range picker */}
      <DateRangePicker onRangeChange={handleRangeChange} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Total Scans</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white" aria-live="polite">
            {data.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">~Unique Scans</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white" aria-live="polite">
            {data.unique}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Approximated by distinct day + device + country
          </p>
        </div>
      </div>

      {/* Export CSV button + Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Scans Over Time
          </h2>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        <ScanChart data={data.timeSeries} />
      </div>

      {/* Device breakdown */}
      <div className="mb-6">
        <ProgressBarList heading="Device Breakdown" items={deviceItems} />
      </div>

      {/* Top countries */}
      <div className="mb-6">
        <ProgressBarList heading="Top Countries" items={countryItems} />
      </div>

      {/* UTM breakdown */}
      <UtmBreakdown utm={data.utm} />
    </div>
  );
}
