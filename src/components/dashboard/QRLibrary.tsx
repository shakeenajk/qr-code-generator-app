import { useState, useEffect } from 'react';
import { Grid2X2, List, Pencil, Trash2, QrCode, Pause, Play, BarChart2, Calendar } from 'lucide-react';
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
  slug?: string | null;
  destinationUrl?: string | null;
  isPaused?: boolean | null;
  isDynamic?: boolean;
  scheduledEnableAt?: number | null;
  scheduledPauseAt?: number | null;
  landingPageId?: string | null;
  landingPageSlug?: string | null;
  landingPageTitle?: string | null;
  landingPageType?: string | null;
  isLandingPage?: boolean;
}

type ViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'qrlibrary-view-mode';

function getScheduleStatus(qr: SavedQR): 'scheduled' | 'active' | 'paused' | 'expired' | null {
  if (!qr.isDynamic) return null;
  const now = Math.floor(Date.now() / 1000);
  if (qr.scheduledEnableAt && qr.scheduledEnableAt > now) return 'scheduled';
  if (qr.scheduledPauseAt && qr.scheduledPauseAt <= now) return 'expired';
  if (!qr.isPaused && qr.scheduledPauseAt && qr.scheduledPauseAt > now) return 'active';
  if (qr.isPaused && !qr.scheduledEnableAt) return 'paused';
  if (!qr.isPaused && !qr.scheduledPauseAt) return 'active';
  return qr.isPaused ? 'paused' : 'active';
}

function useCountdown(targetEpoch: number | null): string {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!targetEpoch) { setText(''); return; }
    const tick = () => {
      const diff = targetEpoch - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setText('activating soon'); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      if (d > 0) setText(`${d}d ${h}h`);
      else if (h > 0) setText(`${h}h ${m}m`);
      else setText(`${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000); // update every minute
    return () => clearInterval(id);
  }, [targetEpoch]);
  return text;
}

function ThumbnailPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 dark:bg-slate-800 ${className ?? ''}`}>
      <QrCode className="w-10 h-10 text-gray-300 dark:text-slate-600" />
    </div>
  );
}

function DynamicBadge() {
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 leading-none"
      aria-label="Dynamic QR code"
    >
      Dynamic
    </span>
  );
}

function PdfBadge() {
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 leading-none"
      aria-label="PDF Landing Page"
    >
      PDF
    </span>
  );
}

function AppStoreBadge() {
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 leading-none"
      aria-label="App Store Landing Page"
    >
      App Store
    </span>
  );
}

function PdfCardBody({ qr }: { qr: SavedQR }) {
  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <PdfBadge />
      </div>
      {qr.landingPageTitle && (
        <p className="text-sm text-gray-700 dark:text-slate-300 truncate">{qr.landingPageTitle}</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <a
          href={'/p/' + qr.landingPageSlug}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View Page
        </a>
        <a
          href={'/dashboard/edit-landing/' + qr.landingPageId}
          aria-label="Edit landing page"
          className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function AppStoreCardBody({ qr }: { qr: SavedQR }) {
  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <AppStoreBadge />
      </div>
      {qr.landingPageTitle && (
        <p className="text-sm text-gray-700 dark:text-slate-300 truncate">{qr.landingPageTitle}</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <a
          href={'/p/' + qr.landingPageSlug}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View Page
        </a>
        <a
          href={'/dashboard/edit-landing/' + qr.landingPageId}
          aria-label="Edit landing page"
          className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="w-4 h-4" />
        </a>
      </div>
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
  onEdit: (qr: SavedQR) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function CardActions({ qr, deletingId, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: CardActionsProps) {
  if (deletingId === qr.id) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600 dark:text-slate-400 mr-1">
          {qr.isLandingPage
            ? 'Are you sure? This will delete the QR code and its hosted page permanently.'
            : 'Are you sure?'}
        </span>
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
          {qr.isLandingPage ? 'Keep it' : 'Cancel'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {qr.isDynamic && qr.slug && !qr.isLandingPage && (
        <a
          href={`/dashboard/analytics/${qr.slug}`}
          aria-label={`View analytics for ${qr.name}`}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Analytics
        </a>
      )}
      {!qr.isLandingPage && (
        <button
          onClick={() => onEdit(qr)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      )}
      <button
        onClick={() => onDeleteRequest(qr.id)}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {qr.isLandingPage ? 'Delete Page' : 'Delete'}
      </button>
    </div>
  );
}

interface DynamicCardBodyProps {
  qr: SavedQR;
  editingDestId: string | null;
  editingDestValue: string;
  savingDestId: string | null;
  togglingPauseId: string | null;
  schedulingQrId: string | null;
  scheduleEnableInput: string;
  schedulePauseInput: string;
  savingScheduleId: string | null;
  onEditingDestValueChange: (value: string) => void;
  onStartEditingDest: (id: string, currentUrl: string) => void;
  onSaveDestination: (id: string) => void;
  onDiscardDest: () => void;
  onTogglePause: (id: string, currentlyPaused: boolean) => void;
  onToggleScheduleEditor: (id: string) => void;
  onScheduleEnableInputChange: (value: string) => void;
  onSchedulePauseInputChange: (value: string) => void;
  onSaveSchedule: (id: string) => void;
  onClearSchedule: (id: string) => void;
}

function DynamicCardBody({
  qr,
  editingDestId,
  editingDestValue,
  savingDestId,
  togglingPauseId,
  schedulingQrId,
  scheduleEnableInput,
  schedulePauseInput,
  savingScheduleId,
  onEditingDestValueChange,
  onStartEditingDest,
  onSaveDestination,
  onDiscardDest,
  onTogglePause,
  onToggleScheduleEditor,
  onScheduleEnableInputChange,
  onSchedulePauseInputChange,
  onSaveSchedule,
  onClearSchedule,
}: DynamicCardBodyProps) {
  const isPaused = Boolean(qr.isPaused);
  const scheduleStatus = getScheduleStatus(qr);
  const countdown = useCountdown(scheduleStatus === 'scheduled' ? (qr.scheduledEnableAt ?? null) : null);
  const isScheduleOpen = schedulingQrId === qr.id;

  // Badge config per status
  const badgeConfig = {
    scheduled: { dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', label: 'Scheduled' },
    active: { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', label: 'Active' },
    paused: { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', label: 'Paused' },
    expired: { dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400', label: 'Expired' },
  };

  const badge = scheduleStatus ? badgeConfig[scheduleStatus] : badgeConfig[isPaused ? 'paused' : 'active'];

  return (
    <>
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span
          className={`w-2 h-2 rounded-full inline-block ${badge.dot}`}
          aria-hidden="true"
        />
        <span className={`text-xs font-medium ${badge.text}`}>
          {badge.label}
          {scheduleStatus === 'scheduled' && countdown && (
            <span className="ml-1 font-normal opacity-75">in {countdown}</span>
          )}
        </span>
        {/* Scheduled activation date */}
        {scheduleStatus === 'scheduled' && qr.scheduledEnableAt && (
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {new Date(qr.scheduledEnableAt * 1000).toLocaleDateString()}
          </span>
        )}
        {/* Active with upcoming pause */}
        {scheduleStatus === 'active' && qr.scheduledPauseAt && qr.scheduledPauseAt > Math.floor(Date.now() / 1000) && (
          <span className="text-xs text-gray-400 dark:text-slate-500">
            Pauses {new Date(qr.scheduledPauseAt * 1000).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Destination URL display or inline editor */}
      {editingDestId === qr.id ? (
        <div className="mt-2">
          <input
            type="url"
            value={editingDestValue}
            onChange={e => onEditingDestValueChange(e.target.value)}
            aria-label="Destination URL"
            placeholder="https://example.com"
            className="w-full px-2 py-1 text-xs border border-indigo-500 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex items-center mt-1">
            <button
              onClick={() => onSaveDestination(qr.id)}
              disabled={savingDestId === qr.id}
              className={`text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors ${savingDestId === qr.id ? 'opacity-60 cursor-wait' : ''}`}
            >
              Save URL
            </button>
            <button
              onClick={onDiscardDest}
              className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 ml-2 cursor-pointer"
            >
              Discard changes
            </button>
          </div>
        </div>
      ) : (
        qr.destinationUrl && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[240px]">
              {qr.destinationUrl}
            </span>
            <button
              onClick={() => onStartEditingDest(qr.id, qr.destinationUrl!)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer ml-1 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded"
            >
              <Pencil className="w-3 h-3" />
              <span className="sr-only">Edit destination URL</span>
            </button>
          </div>
        )
      )}

      {/* Pause/Activate + Schedule buttons */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onTogglePause(qr.id, isPaused)}
          disabled={togglingPauseId === qr.id}
          aria-label={isPaused ? 'Activate QR code' : 'Pause QR code'}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors min-h-[44px] sm:min-h-0 ${
            togglingPauseId === qr.id ? 'opacity-60 cursor-wait' : ''
          } ${
            isPaused
              ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950'
              : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950'
          }`}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {isPaused ? 'Activate' : 'Pause'}
        </button>

        {/* Schedule button */}
        <button
          onClick={() => onToggleScheduleEditor(qr.id)}
          aria-label="Set schedule"
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors min-h-[44px] sm:min-h-0 ${
            isScheduleOpen
              ? 'border-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700'
              : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Schedule
        </button>
      </div>

      {/* Schedule editor (inline expandable) */}
      {isScheduleOpen && (
        <div className="mt-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Activate on
            </label>
            <input
              type="datetime-local"
              value={scheduleEnableInput}
              onChange={e => onScheduleEnableInputChange(e.target.value)}
              aria-label="Activation date and time"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Deactivate on <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={schedulePauseInput}
              onChange={e => onSchedulePauseInputChange(e.target.value)}
              aria-label="Deactivation date and time"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSaveSchedule(qr.id)}
              disabled={savingScheduleId === qr.id}
              className={`text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium ${
                savingScheduleId === qr.id ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              Save Schedule
            </button>
            {(qr.scheduledEnableAt || qr.scheduledPauseAt) && (
              <button
                onClick={() => onClearSchedule(qr.id)}
                className="text-xs text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors"
              >
                Clear Schedule
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function QRLibrary() {
  const [qrCodes, setQrCodes] = useState<SavedQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [editingDestValue, setEditingDestValue] = useState('');
  const [savingDestId, setSavingDestId] = useState<string | null>(null);
  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null);
  const [schedulingQrId, setSchedulingQrId] = useState<string | null>(null);
  const [scheduleEnableInput, setScheduleEnableInput] = useState('');
  const [schedulePauseInput, setSchedulePauseInput] = useState('');
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);

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

  function handleEdit(qr: SavedQR) {
    if (qr.isLandingPage && qr.landingPageId) {
      window.location.href = `/dashboard/edit-landing/${qr.landingPageId}`;
    } else {
      window.location.href = `/?edit=${qr.id}`;
    }
  }

  function handleDeleteRequest(id: string) {
    setDeletingId(id);
  }

  function handleDeleteCancel() {
    setDeletingId(null);
  }

  async function handleDeleteConfirm(id: string) {
    const qr = qrCodes.find(q => q.id === id);
    try {
      // For landing pages, use DELETE /api/landing/[landingPageId]; for others use /api/qr/[id]
      const deleteUrl = qr?.isLandingPage && qr.landingPageId
        ? `/api/landing/${qr.landingPageId}`
        : `/api/qr/${id}`;
      const res = await fetch(deleteUrl, { method: 'DELETE' });
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

  const startEditingDest = (id: string, currentUrl: string) => {
    setEditingDestId(id);
    setEditingDestValue(currentUrl);
  };

  const discardDest = () => {
    setEditingDestId(null);
    setEditingDestValue('');
  };

  const saveDestination = async (id: string) => {
    setSavingDestId(id);
    try {
      const res = await fetch(`/api/qr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationUrl: editingDestValue }),
      });
      if (!res.ok) throw new Error();
      setQrCodes(prev => prev.map(qr =>
        qr.id === id ? { ...qr, destinationUrl: editingDestValue } : qr
      ));
      setEditingDestId(null);
      toast.success('Destination updated');
    } catch {
      toast.error('Failed to update destination. Please try again.');
    } finally {
      setSavingDestId(null);
    }
  };

  const togglePause = async (id: string, currentlyPaused: boolean) => {
    setTogglingPauseId(id);
    try {
      const res = await fetch(`/api/qr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: !currentlyPaused }),
      });
      if (!res.ok) throw new Error();
      setQrCodes(prev => prev.map(qr =>
        qr.id === id ? { ...qr, isPaused: !currentlyPaused } : qr
      ));
      toast.success(currentlyPaused ? 'QR activated' : 'QR paused — scanners will see a holding page');
    } catch {
      toast.error('Could not update status. Please try again.');
    } finally {
      setTogglingPauseId(null);
    }
  };

  function toggleScheduleEditor(id: string) {
    if (schedulingQrId === id) {
      setSchedulingQrId(null);
      setScheduleEnableInput('');
      setSchedulePauseInput('');
    } else {
      // Pre-populate inputs with existing schedule if any
      const qr = qrCodes.find(q => q.id === id);
      if (qr?.scheduledEnableAt) {
        const dt = new Date(qr.scheduledEnableAt * 1000);
        // Format as datetime-local value: "YYYY-MM-DDTHH:MM"
        const pad = (n: number) => String(n).padStart(2, '0');
        setScheduleEnableInput(
          `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
        );
      } else {
        setScheduleEnableInput('');
      }
      if (qr?.scheduledPauseAt) {
        const dt = new Date(qr.scheduledPauseAt * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        setSchedulePauseInput(
          `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
        );
      } else {
        setSchedulePauseInput('');
      }
      setSchedulingQrId(id);
    }
  }

  const saveSchedule = async (id: string) => {
    const enableEpoch = scheduleEnableInput
      ? Math.floor(new Date(scheduleEnableInput).getTime() / 1000)
      : null;
    const pauseEpoch = schedulePauseInput
      ? Math.floor(new Date(schedulePauseInput).getTime() / 1000)
      : null;

    // Validate
    const now = Math.floor(Date.now() / 1000);
    if (enableEpoch && enableEpoch <= now) {
      toast.error('Activation date must be in the future');
      return;
    }
    if (enableEpoch && pauseEpoch && pauseEpoch <= enableEpoch) {
      toast.error('Deactivation date must be after activation date');
      return;
    }
    if (!enableEpoch && pauseEpoch) {
      toast.error('Set an activation date first');
      return;
    }

    setSavingScheduleId(id);
    try {
      const res = await fetch(`/api/qr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledEnableAt: enableEpoch,
          scheduledPauseAt: pauseEpoch,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Failed to save schedule');
      }
      setQrCodes(prev => prev.map(qr =>
        qr.id === id
          ? { ...qr, scheduledEnableAt: enableEpoch, scheduledPauseAt: pauseEpoch, isPaused: enableEpoch ? true : qr.isPaused }
          : qr
      ));
      setSchedulingQrId(null);
      toast.success('Schedule saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save schedule. Please try again.');
    } finally {
      setSavingScheduleId(null);
    }
  };

  const clearSchedule = async (id: string) => {
    setSavingScheduleId(id);
    try {
      const res = await fetch(`/api/qr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledEnableAt: null, scheduledPauseAt: null }),
      });
      if (!res.ok) throw new Error();
      setQrCodes(prev => prev.map(qr =>
        qr.id === id ? { ...qr, scheduledEnableAt: null, scheduledPauseAt: null } : qr
      ));
      setSchedulingQrId(null);
      setScheduleEnableInput('');
      setSchedulePauseInput('');
      toast.success('Schedule cleared');
    } catch {
      toast.error('Could not clear schedule. Please try again.');
    } finally {
      setSavingScheduleId(null);
    }
  };

  function renderCardBody(qr: SavedQR) {
    if (qr.isLandingPage && qr.landingPageType === 'pdf') {
      return <PdfCardBody qr={qr} />;
    }
    if (qr.isLandingPage && qr.landingPageType === 'appstore') {
      return <AppStoreCardBody qr={qr} />;
    }
    if (qr.isDynamic) {
      return (
        <DynamicCardBody
          qr={qr}
          editingDestId={editingDestId}
          editingDestValue={editingDestValue}
          savingDestId={savingDestId}
          togglingPauseId={togglingPauseId}
          schedulingQrId={schedulingQrId}
          scheduleEnableInput={scheduleEnableInput}
          schedulePauseInput={schedulePauseInput}
          savingScheduleId={savingScheduleId}
          onEditingDestValueChange={setEditingDestValue}
          onStartEditingDest={startEditingDest}
          onSaveDestination={saveDestination}
          onDiscardDest={discardDest}
          onTogglePause={togglePause}
          onToggleScheduleEditor={toggleScheduleEditor}
          onScheduleEnableInputChange={setScheduleEnableInput}
          onSchedulePauseInputChange={setSchedulePauseInput}
          onSaveSchedule={saveSchedule}
          onClearSchedule={clearSchedule}
        />
      );
    }
    return null;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {qrCodes.map(qr => (
            <div
              key={qr.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              {/* Thumbnail */}
              <div className="bg-white rounded-t-lg flex items-center justify-center p-4">
                {qr.thumbnailData ? (
                  <img
                    src={qr.thumbnailData}
                    alt={qr.name}
                    className="w-3/4 aspect-square object-contain"
                  />
                ) : (
                  <ThumbnailPlaceholder className="w-3/4 aspect-square" />
                )}
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col gap-1 flex-1">
                {/* Name row with optional badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{qr.name}</p>
                  {qr.isDynamic && !qr.isLandingPage && <DynamicBadge />}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {new Date(qr.createdAt * 1000).toLocaleDateString()}
                </p>
                {!qr.isDynamic && !qr.isLandingPage && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{qr.contentData}</p>
                )}

                {/* Card body variant */}
                {renderCardBody(qr)}
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-start gap-4 p-3"
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
                {/* Name row with optional badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{qr.name}</p>
                  {qr.isDynamic && !qr.isLandingPage && <DynamicBadge />}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {new Date(qr.createdAt * 1000).toLocaleDateString()}
                </p>
                {!qr.isDynamic && !qr.isLandingPage && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{qr.contentData}</p>
                )}

                {/* Card body variant */}
                {renderCardBody(qr)}
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
