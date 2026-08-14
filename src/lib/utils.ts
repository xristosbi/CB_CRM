import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ensures a stored website value is a usable absolute href without
// mutating what's saved — e.g. "example.gr" -> "https://example.gr".
export function toHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
