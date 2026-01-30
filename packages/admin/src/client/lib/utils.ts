import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a collection name for display
 *
 * Converts camelCase/PascalCase to Title Case with spaces.
 *
 * @example
 * formatCollectionName("blogPosts") // "Blog Posts"
 * formatCollectionName("userSettings") // "User Settings"
 */
export function formatCollectionName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
