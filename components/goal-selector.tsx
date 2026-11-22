"use client";

import {
  CalendarHeart,
  Hand,
  HeartHandshake,
  History,
  MessagesSquare,
  Phone,
  type LucideIcon,
} from "lucide-react";

import { GOALS, type Goal } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GOAL_ICONS: Record<Goal, LucideIcon> = {
  "Keep chatting": MessagesSquare,
  "Ask for number": Phone,
  "Ask on a date": CalendarHeart,
  "Revive a dead convo": History,
  "Politely decline": Hand,
};

interface GoalSelectorProps {
  selected: Goal;
  onChange: (goal: Goal) => void;
}

export function GoalSelector({ selected, onChange }: GoalSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex w-full items-baseline justify-between">
        <span className="text-[13px] font-medium text-foreground">Goal</span>
        <span className="text-[11px] text-muted-foreground">what&apos;s the move?</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {GOALS.map((goal) => {
          const active = goal === selected;
          const Icon = GOAL_ICONS[goal] ?? HeartHandshake;
          return (
            <button
              key={goal}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(goal)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-sm shadow-primary/5"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/25 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground/70")}
                strokeWidth={1.9}
              />
              {goal}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
