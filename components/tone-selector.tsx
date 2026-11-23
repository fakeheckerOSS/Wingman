"use client";

import { Check } from "lucide-react";

import { TONES, type Tone } from "@/lib/constants";
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
      <div className="grid grid-cols-3 gap-2">
        {TONES.map((tone) => {
          const active = selected.includes(tone);
          return (
            <button
              key={tone}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(tone)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-primary bg-primary/15 text-foreground shadow-sm shadow-primary/10"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/30 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/60 text-transparent",
                )}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
              <span className="truncate">{tone}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}