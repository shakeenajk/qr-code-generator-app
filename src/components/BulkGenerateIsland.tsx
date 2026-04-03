import { useState, useRef, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Upload, FileText, X, ArrowRight, Loader2, Download } from 'lucide-react';
import { BULK_TIER_LIMITS } from '../lib/bulkLimits';

interface BulkGenerateIslandProps {
  tier: 'free' | 'starter' | 'pro';
}

type ColumnType = 'url' | 'text' | 'wifi' | null;
type WorkflowStatus = 'idle' | 'parsed' | 'generating' | 'complete';

// Normalized row with lowercase keys from CSV header
type ParsedRow = Record<string, string>;

interface GeneratedBlob {
  name: string;
  blob: Blob;
}

interface Preview {
  name: string;
  src: string;
}

const CHUNK_SIZE = 10;

/** Sanitize a filename: replace non-alphanumeric (except dash/dot) with dash */
function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\-_.]/g, '-');
}

/** Encode a WiFi row into standard WIFI: URI */
function encodeWifi(row: ParsedRow): string {
  const ssid = row['ssid'] ?? '';
  const password = row['password'] ?? '';
  return `WIFI:T:WPA;S:${ssid};P:${password};;`;
}

export default function BulkGenerateIsland({ tier }: BulkGenerateIslandProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [columnType, setColumnType] = useState<ColumnType>(null);
  const [generatedBlobs, setGeneratedBlobs] = useState<GeneratedBlob[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [status, setStatus] = useState<WorkflowStatus>('idle');

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Ref to signal cancellation of the generation loop
  const cancelRef = useRef(false);
  // Ref to track current preview URLs for cleanup
  const previewUrlsRef = useRef<string[]>([]);

  // --- Memory cleanup on unmount ---
  useEffect(() => {
    return () => {
      // Revoke all preview object URLs on unmount
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current = [];
    };
  }, []);

  /** Revoke existing preview URLs and clear previews state */
  const clearPreviews = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];
    setPreviews([]);
    setGeneratedBlobs([]);
  }, []);

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

      // Clear existing previews before new CSV
      clearPreviews();

      setCsvFile(file);
      setParseError(null);
      setParsedRows([]);
      setColumnType(null);
      setStatus('idle');

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<Record<string, string>>) => {
          // Normalize column keys to lowercase + trim
          const normalized: ParsedRow[] = results.data.map((row: Record<string, string>) => {
            const norm: ParsedRow = {};
            for (const [key, val] of Object.entries(row)) {
              norm[key.toLowerCase().trim()] = (val as string) ?? '';
            }
            return norm;
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

          // Tier limit enforcement (UX/product gate — client-side only)
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
        error: (err: Error) => {
          setParseError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    [tier, clearPreviews]
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
    clearPreviews();
    setCsvFile(null);
    setParsedRows([]);
    setParseError(null);
    setColumnType(null);
    setStatus('idle');
  };

  // --- QR generation loop ---
  const handleGenerate = async () => {
    if (parsedRows.length === 0 || !columnType) return;

    // Reset cancel flag
    cancelRef.current = false;

    // Clear previous results
    clearPreviews();

    setStatus('generating');
    setProgress({ current: 0, total: parsedRows.length });

    // Dynamic import to avoid SSR issues
    const QRCodeStyling = (await import('qr-code-styling')).default;

    const results: GeneratedBlob[] = [];
    const newPreviewUrls: string[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      // Check for cancel signal
      if (cancelRef.current) {
        // Revoke partial preview URLs
        for (const url of newPreviewUrls) {
          URL.revokeObjectURL(url);
        }
        previewUrlsRef.current = [];
        setStatus('parsed');
        setProgress({ current: 0, total: 0 });
        return;
      }

      const row = parsedRows[i];

      // Determine QR data based on column type
      let qrData: string;
      if (columnType === 'url') {
        qrData = row['url'] ?? '';
      } else if (columnType === 'text') {
        qrData = row['text'] ?? '';
      } else {
        qrData = encodeWifi(row);
      }

      // Create QR code
      const qr = new QRCodeStyling({
        width: 512,
        height: 512,
        type: 'canvas',
        data: qrData,
        dotsOptions: { type: 'rounded', color: '#1e293b' },
        backgroundOptions: { color: '#ffffff' },
      });

      const blob = (await qr.getRawData('png')) as Blob;

      // Determine filename
      const rawName = row['name'] ?? `qr-${i + 1}`;
      const filename = sanitizeFilename(rawName) + '.png';

      results.push({ name: filename, blob });

      // Create preview URL and track it
      const previewUrl = URL.createObjectURL(blob);
      newPreviewUrls.push(previewUrl);

      // Update previews incrementally (replace ref + state)
      previewUrlsRef.current = [...newPreviewUrls];
      setPreviews((prev) => [...prev, { name: filename, src: previewUrl }]);

      // Update progress
      setProgress({ current: i + 1, total: parsedRows.length });

      // Yield main thread every CHUNK_SIZE rows to keep UI responsive
      if ((i + 1) % CHUNK_SIZE === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    setGeneratedBlobs(results);
    setStatus('complete');
  };

  // --- Cancel generation ---
  const handleCancel = () => {
    cancelRef.current = true;
  };

  // --- ZIP download ---
  const handleDownload = async () => {
    if (generatedBlobs.length === 0) return;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const { name, blob } of generatedBlobs) {
      zip.file(name, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrcodes.zip';
    a.click();
    // Immediately revoke ZIP blob URL
    URL.revokeObjectURL(url);
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
    <div className="max-w-3xl space-y-6">
      {/* Tier info banner */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        Your <span className="font-semibold capitalize">{tier}</span> plan supports up to{' '}
        <span className="font-semibold">{cap} rows</span> per batch.
      </div>

      {/* Upload zone — hidden during generation/complete */}
      {status !== 'generating' && status !== 'complete' && (
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
      )}

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
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Generate All
            </button>
          </div>
        </div>
      )}

      {/* Progress bar — visible during generation */}
      {status === 'generating' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {progress.current} of {progress.total}...
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-150"
              style={{
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Thumbnail preview grid — shown during and after generation */}
      {previews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {status === 'complete'
                ? `${previews.length} QR codes generated`
                : `Generating... (${previews.length} so far)`}
            </p>
            {status === 'complete' && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 p-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {previews.map((preview, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="aspect-square w-full bg-white rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm p-1">
                    <img
                      src={preview.src}
                      alt={preview.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-full truncate text-center max-w-[80px]">
                    {preview.name.replace('.png', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ZIP download button — visible after completion */}
      {status === 'complete' && generatedBlobs.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download ZIP ({generatedBlobs.length} QR {generatedBlobs.length === 1 ? 'code' : 'codes'})
          </button>
        </div>
      )}

      {/* Template download section — only shown in idle/parsed state */}
      {(status === 'idle' || status === 'parsed') && (
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
      )}
    </div>
  );
}
