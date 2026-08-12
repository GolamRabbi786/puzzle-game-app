import { cn } from "@/lib/utils";

/** Colorful 2×2 puzzle-piece mark used as the GameZone logo. */
export function GameLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden="true">
      <rect x="3" y="3" width="20" height="20" rx="6" fill="#f97316" />
      <rect x="25" y="3" width="20" height="20" rx="6" fill="#2dd4bf" />
      <rect x="3" y="25" width="20" height="20" rx="6" fill="#f472b6" />
      <rect x="25" y="25" width="20" height="20" rx="6" fill="#facc15" />
      <circle cx="13" cy="13" r="4.5" fill="#ffffff" opacity="0.9" />
      <circle cx="35" cy="35" r="4.5" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}
