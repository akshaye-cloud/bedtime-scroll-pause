import { cn } from "@/lib/utils";

/**
 * Brand mark: a phone with a pause symbol on its screen.
 * Drawn with currentColor so it picks up theme tokens.
 */
export function PauseMark({
  size = 28,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      {/* phone body */}
      <rect x="5.5" y="2" width="13" height="20" rx="3.6" />
      {/* speaker + home indicator */}
      <path d="M10.6 3.6h2.8M10.6 20.4h2.8" opacity="0.55" />
      {/* screen */}
      <rect x="7.7" y="4.8" width="8.6" height="14.2" rx="1.6" opacity="0.35" />
      {/* pause symbol on the screen */}
      <rect x="9.8" y="8.6" width="1.7" height="6.4" rx="0.85" fill="currentColor" stroke="none" />
      <rect x="12.5" y="8.6" width="1.7" height="6.4" rx="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}
