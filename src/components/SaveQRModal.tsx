import { useState, useEffect, useRef } from "react";

export interface SaveQRModalProps {
  isOpen: boolean;
  defaultName: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export function SaveQRModal({ isOpen, defaultName, onSave, onClose, isSaving }: SaveQRModalProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync defaultName into local state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      // Focus after paint
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultName]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="save-modal-heading"
      onClick={(e) => {
        // Close when clicking backdrop (not the card)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2
          id="save-modal-heading"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        >
          Save to Library
        </h2>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="qr-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Name
          </label>
          <input
            ref={inputRef}
            id="qr-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Coffee Shop QR"
            maxLength={60}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-900 dark:text-white bg-white dark:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {name.length}/60 characters
          </p>

          <div className="flex gap-3 mt-5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                         bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                         rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || name.trim().length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                         hover:bg-blue-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
