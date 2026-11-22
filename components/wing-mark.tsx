import { cn } from "@/lib/utils";

/** Small custom wing glyph used in the wordmark. */
export function WingMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path
        d="M3.6 17.1c4.9-.2 9-2.4 12.3-6.4 1.4-1.7 2.8-3.5 4.5-5 .1 3.8-1.3 6.9-3.8 9.3-2.6 2.5-6.1 3.8-9.8 3.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.9 15.2c1.5-.2 2.9-.8 4.1-1.8M10.7 17.7c1.2-.1 2.3-.5 3.3-1.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
