export { cn } from "cn"

// Up to two uppercase initials from a display name. Never empty.
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("");
  return (letters || "?").slice(0, 2).toUpperCase();
}
