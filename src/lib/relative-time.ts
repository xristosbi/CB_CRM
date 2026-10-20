// Greek relative time ("πριν 2 ώρες") for activity feed / last-contact
// indicators. Approximate on purpose (round, not exact) — good enough for
// "how recently did someone talk to this lead".
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "μόλις τώρα";
  if (diffMinutes < 60) return `πριν ${diffMinutes} λεπτ${diffMinutes === 1 ? "ό" : "ά"}`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `πριν ${diffHours} ώρ${diffHours === 1 ? "α" : "ες"}`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `πριν ${diffDays} μέρ${diffDays === 1 ? "α" : "ες"}`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `πριν ${diffMonths} μήν${diffMonths === 1 ? "α" : "ες"}`;

  const diffYears = Math.round(diffMonths / 12);
  return `πριν ${diffYears} χρόν${diffYears === 1 ? "ο" : "ια"}`;
}
