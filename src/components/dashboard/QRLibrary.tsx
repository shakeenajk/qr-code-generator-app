import { useState, useEffect } from 'react';
import { Grid2X2, List, Pencil, Trash2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface SavedQR {
  id: string;
  userId: string;
  name: string;
  contentType: 'url' | 'text' | 'wifi' | 'vcard';
  contentData: string;
  styleData: string;
  thumbnailData: string | null;
  createdAt: number;
  updatedAt: number;
}

type ViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'qrlibrary-view-mode';

function ThumbnailPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 dark:bg-slate-800 ${className ?? ''}`}>
      <QrCode className="w-10 h-10 text-gray-300 dark:text-slate-600" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {/* Simple inline SVG illustration */}
      <svg
        className="w-24 h-24 mb-6 text-gray-200 dark:text-slate-700"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" />
        <rect x="52" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" />
        <rect x="4" y="52" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" />
        <rect x="60" y="60" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" />
        <rect x="12" y="12" width="24" height="24" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="60" y="12" width="24" height="24" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="12" y="60" width="24" height="24" rx="2" fill="currentColor" opacity="0.3" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">No QR codes yet</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-xs">
        Save a generated QR code to build your library.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Go to Generator
      </a>
    </div>
  );
}

interface CardActionsProps {
  qr: SavedQR;
  deletingId: string | null;
  onEdit: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function CardActions({ qr, deletingId, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: CardActionsProps) {
  if (deletingId === qr.id) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600 dark:text-slate-400 mr-1">Are you sure?</span>
        <button
          onClick={() => onDeleteConfirm(qr.id)}
          className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
        >
          Yes, delete
        </button>
        <button
          onClick={onDeleteCancel}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onEdit(qr.id)}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </button>
      <button
        onClick={() => onDeleteRequest(qr.id)}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
}

export default function QRLibrary() {
  const [qrCodes, setQrCodes] = useState<SavedQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load persisted view mode preference
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'list' || stored === 'grid') {
      setViewMode(stored);
    }
  }, []);

  // Fetch QR codes on mount
  useEffect(() => {
    fetch('/api/qr/list')
      .then(r => r.json())
      .then((data: SavedQR[]) => {
        setQrCodes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function handleEdit(id: string) {
    window.location.href = `/?edit=${id}`;
  }

  function handleDeleteRequest(id: string) {
    setDeletingId(id);
  }

  function handleDeleteCancel() {
    setDeletingId(null);
  }

  async function handleDeleteConfirm(id: string) {
    try {
      const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQrCodes(prev => prev.filter(q => q.id !== id));
        toast('QR code deleted');
      } else {
        toast.error('Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (qrCodes.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Library header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My QR Codes</h2>
        <div className="flex items-center gap-1 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
          <button
            onClick={() => handleViewModeChange('grid')}
            aria-label="Grid view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            aria-label="List view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map(qr => (
            <div
              key={qr.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              {/* Thumbnail */}
              {qr.thumbnailData ? (
                <img
                  src={qr.thumbnailData}
                  alt={qr.name}
                  className="w-full aspect-square object-contain rounded-t-lg bg-white p-4"
                />
              ) : (
                <ThumbnailPlaceholder className="w-full aspect-square rounded-t-lg" />
              )}

              {/* Card body */}
              <div className="p-4 flex flex-col gap-1 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{qr.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {new Date(qr.createdAt * 1000).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{qr.contentData}</p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4">
                <CardActions
                  qr={qr}
                  deletingId={deletingId}
                  onEdit={handleEdit}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {qrCodes.map(qr => (
            <div
              key={qr.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 p-3"
            >
              {/* Small thumbnail */}
              {qr.thumbnailData ? (
                <img
                  src={qr.thumbnailData}
                  alt={qr.name}
                  className="w-12 h-12 object-contain rounded bg-white flex-shrink-0"
                />
              ) : (
                <ThumbnailPlaceholder className="w-12 h-12 rounded flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{qr.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {new Date(qr.createdAt * 1000).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{qr.contentData}</p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <CardActions
                  qr={qr}
                  deletingId={deletingId}
                  onEdit={handleEdit}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
