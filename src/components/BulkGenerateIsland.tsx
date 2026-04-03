import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Upload, FileText, X, ArrowRight } from 'lucide-react';
import { BULK_TIER_LIMITS } from '../lib/bulkLimits';

interface BulkGenerateIslandProps {
  tier: 'free' | 'starter' | 'pro';
}

type ColumnType = 'url' | 'text' | 'wifi' | null;
type WorkflowStatus = 'idle' | 'parsed' | 'generating' | 'complete';

// Normalized row with lowercase keys from CSV header
type ParsedRow = Record<string, string>;

export default function BulkGenerateIsland({ tier }: BulkGenerateIslandProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [columnType, setColumnType] = useState<ColumnType>(null);
  // generatedBlobs will be populated by Plan 02
  const [generatedBlobs] = useState<{ name: string; blob: Blob }[]>([]);
  const [isGenerating] = useState(false);
  const [progress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [status, setStatus] = useState<WorkflowStatus>('idle');

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // --- Free tier gate ---
  if (tier === 'free') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-8 text-center max-w-lg mx-auto mt-4">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-amber-100 dark:bg-amber-800/40 p-4">
            <Upload className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Bulk generation is a paid feature
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
          Upgrade to Starter or Pro to upload a CSV and generate up to 50 or 500 QR codes at once
          and download them as a single ZIP file.
        </p>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          View Pricing
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // --- CSV parsing logic ---
  const handleFile = useCallback(
    (file: File) => {
      // Validate type and size
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setParseError('Please upload a .csv file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setParseError('File size must be under 5 MB.');
        return;
      }

      setCsvFile(file);
      setParseError(null);
      setParsedRows([]);
      setColumnType(null);
      setStatus('idle');

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Normalize column keys to lowercase + trim
          const normalized: ParsedRow[] = results.data.map((row) => {
            const normalized: ParsedRow = {};
            for (const [key, val] of Object.entries(row)) {
              normalized[key.toLowerCase().trim()] = (val as string) ?? '';
            }
            return normalized;
          });

          if (normalized.length === 0) {
            setParseError('CSV has no data rows.');
            return;
          }

          // Detect column type
          const firstRow = normalized[0];
          let detectedType: ColumnType = null;
          if ('url' in firstRow) {
            detectedType = 'url';
          } else if ('text' in firstRow) {
            detectedType = 'text';
          } else if ('ssid' in firstRow) {
            detectedType = 'wifi';
          }

          if (!detectedType) {
            setParseError("CSV must contain a 'url', 'text', or 'ssid' column.");
            return;
          }

          // Tier limit enforcement
          const cap = BULK_TIER_LIMITS[tier];
          if (normalized.length > cap) {
            toast.error(
              `Your ${tier} plan supports up to ${cap} rows. Upload a smaller CSV or upgrade.`
            );
            return;
          }

          setParsedRows(normalized);
          setColumnType(detectedType);
          setStatus('parsed');
        },
        error: (err) => {
          setParseError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    [tier]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleZoneClick = () => inputRef.current?.click();

  const handleClear = () => {
    setCsvFile(null);
    setParsedRows([]);
    setParseError(null);
    setColumnType(null);
    setStatus('idle');
  };

  // --- Template download helpers ---
  const downloadTemplate = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columnTypeLabel = columnType === 'url' ? 'URL' : columnType === 'text' ? 'Text' : 'WiFi';

  const cap = BULK_TIER_LIMITS[tier];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tier info banner */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        Your <span className="font-semibold capitalize">{tier}</span> plan supports up to{' '}
        <span className="font-semibold">{cap} rows</span> per batch.
      </div>

      {/* Upload zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          CSV File
        </label>
        <div
          className={[
            'relative flex flex-col items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            parseError
              ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
              : isDragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                : csvFile
                  ? 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50'
                  : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-900/10',
          ].join(' ')}
          onClick={handleZoneClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleZoneClick();
            }
          }}
          aria-label="Upload CSV file"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleInputChange}
            tabIndex={-1}
          />

          {csvFile ? (
            <div className="flex flex-col items-center gap-1 px-4 py-4 text-center">
              <FileText className="w-6 h-6 text-gray-500 dark:text-slate-400 mb-1" />
              <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                {csvFile.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {(csvFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-4 text-center">
              <Upload className="w-7 h-7 text-gray-400 dark:text-slate-500" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Drag and drop a CSV file, or{' '}
                <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">Max 5 MB · .csv only</p>
            </div>
          )}
        </div>

        {parseError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {parseError}
          </p>
        )}
      </div>

      {/* Parsed rows summary */}
      {status === 'parsed' && parsedRows.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {parsedRows.length} rows detected (type:{' '}
              <span className="font-semibold">{columnTypeLabel}</span>)
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Preview table: first 5 rows */}
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 sticky top-0">
                <tr>
                  {Object.keys(parsedRows[0]).map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="bg-white dark:bg-slate-900">
                    {Object.values(row).map((val, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-gray-700 dark:text-slate-300 max-w-[200px] truncate"
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedRows.length > 5 && (
            <div className="px-4 py-2 text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-700/50">
              Showing first 5 of {parsedRows.length} rows
            </div>
          )}

          {/* Action row */}
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
              title="Generation coming in next release"
            >
              Generate All
            </button>
          </div>
        </div>
      )}

      {/* Template download section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Download a template to get started:
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadTemplate(
                'qr-url-template.csv',
                'url,name\nhttps://example.com,My Website\nhttps://store.example.com/product,Product Page\n'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Download URL template
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTemplate(
                'qr-text-template.csv',
                'text,name\nHello World,Greeting\nScan to see our menu,Menu QR\n'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Download Text template
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTemplate(
                'qr-wifi-template.csv',
                'ssid,password,name\nMyNetwork,secretpass,Home WiFi\nOfficeNet,work1234,Office WiFi\n'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Download WiFi template
          </button>
        </div>
      </div>

      {/* Hidden state references — prevent unused variable warnings, used by Plan 02 */}
      {/* generatedBlobs, isGenerating, progress consumed by Plan 02 generation loop */}
      <span data-generated-count={generatedBlobs.length} className="sr-only" aria-hidden="true" />
      <span data-is-generating={isGenerating} className="sr-only" aria-hidden="true" />
      <span
        data-progress={`${progress.current}/${progress.total}`}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
}
