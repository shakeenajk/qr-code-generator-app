interface Props {
  tier: 'free' | 'starter' | 'pro';
}

export default function TierBadge({ tier }: Props) {
  if (tier === 'free') return null;

  if (tier === 'starter') {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ml-1.5">
        Starter
      </span>
    );
  }

  // pro
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 ml-1.5">
      Pro
    </span>
  );
}
