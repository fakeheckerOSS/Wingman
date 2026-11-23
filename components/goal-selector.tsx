"use client";

import { GOALS, type Goal } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GoalSelectorProps {
  selected: Goal;
  onChange: (goal: Goal) => void;
}

export function GoalSelector({ selected, onChange }: GoalSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex w-full items-baseline justify-between">
        <span className="text-[13px] font-medium text-foreground">Goal</span>
        <span className="text-[11px] text-foreground/70">what&apos;s the move?</span>
      </legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Goal">
        {GOALS.map((goal) => {
          const active = goal === selected;
          return (
            <button
              key={goal}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(goal)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-primary bg-primary/15 text-foreground shadow-sm shadow-primary/10"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/30 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  active ? "border-primary" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
              </span>
              <span className="truncate">{goal}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}