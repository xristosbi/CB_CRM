// Stable per-user avatar color, independent of display order — same user
// always gets the same color across reloads/sessions without needing a
// stored value. `profiles.color` can still override this when a user
// picks their own.
const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorForUser(user: { id: string; color?: string | null }): string {
  return user.color || PALETTE[hashString(user.id) % PALETTE.length];
}

export function initialsForName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}
