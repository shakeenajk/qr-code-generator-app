import { useEffect, useState } from 'react';

export default function SubscriptionPolling() {
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    // Only activate when URL contains ?upgraded
    if (!window.location.search.includes('upgraded')) return;

    setActivating(true);

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const INTERVAL_MS = 500;

    const intervalId = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/subscription/status');
        if (res.ok) {
          const data = await res.json();
          const tier = data.tier as 'free' | 'starter' | 'pro';

          if (tier !== 'free') {
            clearInterval(intervalId);
            setActivating(false);
            window.history.replaceState({}, '', '/dashboard');
            showToast(`Welcome to ${tier === 'starter' ? 'Starter' : 'Pro'}! Your plan is now active.`);
            return;
          }
        }
      } catch {
        // fail silently, keep trying
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        setActivating(false);
        window.history.replaceState({}, '', '/dashboard');
      }
    }, INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  if (!activating) return null;

  return (
    <div
      data-testid="activating-indicator"
      className="fixed inset-0 flex items-center justify-center bg-black/20 dark:bg-black/40 z-50"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
          Activating your plan...
        </span>
      </div>
    </div>
  );
}

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className =
    'fixed bottom-6 right-6 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50 transition-opacity duration-300';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 5000);
}
