import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Key, Copy, Trash2, Plus, X } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  usageCount: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  createdAt: number;
}

function formatRelativeTime(ts: number | null): string {
  if (ts === null) return 'Never';
  const diffMs = Date.now() - ts * 1000;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

export default function ApiKeyManagerIsland() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/dashboard/api-keys');
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create key');
      }
      const data = await res.json();
      setNewKeyRaw(data.key);
      setNewKeyName('');
      setShowCreateForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(key: ApiKey) {
    const confirmed = window.confirm(
      `Revoke key "${key.keyPrefix}..."? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/dashboard/api-keys/${key.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      toast.success('API key revoked');
      fetchKeys();
    } catch {
      toast.error('Failed to revoke key');
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('API key copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }

  function handleDone() {
    setNewKeyRaw(null);
    fetchKeys();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New key raw display — shown once immediately after creation */}
      {newKeyRaw && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-4">
          <div className="flex items-start gap-3 mb-3">
            <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                Copy this key now. You won't be able to see it again.
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Store it securely — it will not be shown after you close this panel.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-md border border-yellow-200 dark:border-yellow-800 px-3 py-2 mb-3">
            <code className="font-mono text-sm text-gray-800 dark:text-gray-100 flex-1 break-all">
              {newKeyRaw}
            </code>
            <button
              onClick={() => handleCopy(newKeyRaw)}
              className="flex-shrink-0 p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleDone}
            className="px-4 py-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Use these keys to authenticate with the QRCraft REST API.
          </p>
        </div>
        {!showCreateForm && !newKeyRaw && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New API Key</h3>
            <button
              onClick={() => { setShowCreateForm(false); setNewKeyName(''); }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={64}
              disabled={creating}
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 && !newKeyRaw ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
          <Key className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No API keys yet. Create one to start using the QRCraft API.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Key</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Last Used</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const isRevoked = key.revokedAt !== null;
                  return (
                    <tr
                      key={key.id}
                      className={`border-b last:border-b-0 border-gray-200 dark:border-slate-700 ${
                        isRevoked ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                        {key.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-gray-600 dark:text-slate-300">
                          {key.keyPrefix}…
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                        {key.usageCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                        {formatRelativeTime(key.lastUsedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {isRevoked ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevoke(key)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
