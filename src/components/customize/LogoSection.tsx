import { useRef, useState } from "react";

export type LogoSectionState = {
  logoSrc: string | null;
  logoFilename: string | null;
};

export type LogoSectionProps = {
  value: LogoSectionState;
  onChange: (next: LogoSectionState) => void;
};

export function LogoSection({ value, onChange }: LogoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFileSelect(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|svg\+xml|webp)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      onChange({ logoSrc: src, logoFilename: file.name });
    };
    reader.readAsDataURL(file);
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  function handleRemoveLogo() {
    onChange({ logoSrc: null, logoFilename: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section aria-labelledby="logo-heading">
      <h3 id="logo-heading" className="text-sm font-semibold text-gray-900 mb-3 dark:text-white">
        Logo
      </h3>

      {/* Drop zone — shown when no logo uploaded */}
      {!value.logoSrc && (
        <div
          data-testid="logo-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500"
          }`}
          role="button"
          tabIndex={0}
          aria-label="Upload logo image"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400">Drop image or click to upload</p>
          <p className="text-xs text-gray-400 mt-1 dark:text-slate-500">PNG, JPEG, SVG, WebP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {/* Thumbnail + remove — shown when logo is uploaded */}
      {value.logoSrc && (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600">
          <img
            data-testid="logo-thumbnail"
            src={value.logoSrc}
            alt="Logo preview"
            className="w-12 h-12 object-contain rounded border border-gray-100"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 truncate dark:text-slate-300">{value.logoFilename}</p>
            <button
              data-testid="logo-remove"
              onClick={handleRemoveLogo}
              className="text-xs text-red-600 hover:text-red-700 underline mt-1"
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* ECL info note — visible when logo is active (LOGO-02 communication) */}
      {value.logoSrc && (
        <div
          data-testid="logo-ecl-notice"
          className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2"
          role="note"
        >
          Error correction set to H for logo scannability
        </div>
      )}
    </section>
  );
}
