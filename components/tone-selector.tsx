"use client";

import { TONES, TONE_COLORS, type Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ToneSelectorProps {
  selected: Tone[];
  onToggle: (tone: Tone) => void;
}

export function ToneSelector({ selected, onToggle }: ToneSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex w-full items-baseline justify-between">
        <span className="text-[13px] font-medium text-foreground">Tone</span>
        <span className="text-[11px] text-muted-foreground">pick a few</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {TONES.map((tone) => {
          const active = selected.includes(tone);
          return (
            <button
              key={tone}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(tone)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-sm shadow-primary/5"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/25 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full transition-opacity"
                style={{
                  backgroundColor: TONE_COLORS[tone],
                  opacity: active ? 1 : 0.4,
                }}
              />
              {tone}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
