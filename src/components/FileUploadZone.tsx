import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface FileUploadZoneProps {
  label: string;
  accept: string;
  maxSizeMB: number;
  file: File | null;
  existingUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  errorMessage?: string | null;
  helperText?: string;
  isUploading?: boolean;
}

export default function FileUploadZone({
  label,
  accept,
  maxSizeMB,
  file,
  existingUrl,
  onFileSelect,
  errorMessage,
  helperText,
  isUploading = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasFile = file !== null || !!existingUrl;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      onFileSelect(null);
      return;
    }
    onFileSelect(selectedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    handleFileChange(selected);
    // Reset input so same file can be re-selected after removal
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  };

  // Determine border/bg classes based on state
  const zoneClasses = [
    "relative flex flex-col items-center justify-center min-h-[96px] rounded-lg border-2 border-dashed",
    "cursor-pointer transition-colors",
    errorMessage
      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
      : isDragOver
      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
      : hasFile
      ? "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50"
      : "border-gray-300 dark:border-slate-600",
    isUploading ? "opacity-70 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1">
      <div
        className={zoneClasses}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={label}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleInputChange}
          disabled={isUploading}
          tabIndex={-1}
        />

        {isUploading ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" aria-hidden="true" />
            <span className="text-sm text-gray-600 dark:text-slate-300">Uploading…</span>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
            <span className="text-sm text-gray-700 dark:text-slate-300 break-all">
              {file ? file.name : existingUrl?.split("/").pop() ?? "Existing file"}
            </span>
            {file && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {formatSize(file.size)}
              </span>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-500 hover:text-red-700 mt-1"
            >
              Remove
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-slate-400 px-4 py-3 text-center">
            {label}
          </span>
        )}
      </div>

      {helperText && !errorMessage && (
        <p className="text-xs text-gray-400 dark:text-slate-500">{helperText}</p>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
