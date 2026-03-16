import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/astro/react';

export default function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isLoaded || !user) return null;

  const initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '');
  const displayName = user.fullName ?? user.firstName ?? 'Account';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {initials || '?'}
          </span>
        )}
        {/* Name */}
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">
          {displayName}
        </span>
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-gray-200 dark:ring-slate-700 py-1 z-50">
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => setOpen(false)}
          >
            My Dashboard
          </a>
          <button
            onClick={() => { openUserProfile(); setOpen(false); }}
            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Account Settings
          </button>
          <hr className="my-1 border-gray-100 dark:border-slate-700" />
          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
