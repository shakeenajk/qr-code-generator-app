import { useState } from 'react';

interface DateRangePickerProps {
  onRangeChange: (from: number, to: number) => void;
}

type Preset = '7d' | '30d' | '90d' | '12mo' | 'all';

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '12mo', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
];

function toUnixSec(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function computePreset(preset: Preset): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  switch (preset) {
    case '7d':
      return { from: now - 7 * 24 * 60 * 60, to: now };
    case '30d':
      return { from: now - 30 * 24 * 60 * 60, to: now };
    case '90d':
      return { from: now - 90 * 24 * 60 * 60, to: now };
    case '12mo':
      return { from: now - 365 * 24 * 60 * 60, to: now };
    case 'all':
      return { from: 0, to: now };
  }
}

export default function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<Preset | null>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function handlePreset(preset: Preset) {
    setActivePreset(preset);
    setCustomFrom('');
    setCustomTo('');
    const { from, to } = computePreset(preset);
    onRangeChange(from, to);
  }

  function handleCustomChange(newFrom: string, newTo: string) {
    setActivePreset(null);
    if (newFrom && newTo) {
      const fromSec = toUnixSec(newFrom);
      const toSec = toUnixSec(newTo) + 86399; // include the end day
      if (fromSec < toSec) {
        onRangeChange(fromSec, toSec);
      }
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 mb-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePreset(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              activePreset === key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          From
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              handleCustomChange(e.target.value, customTo);
            }}
            className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          To
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              handleCustomChange(customFrom, e.target.value);
            }}
            className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>
    </div>
  );
}
