"use client";

import { MessagesSquare, Sparkles, type LucideIcon } from "lucide-react";

import type { Mode } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ModeOption {
  value: Mode;
  label: string;
  icon: LucideIcon;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: "replies", label: "Replies", icon: MessagesSquare },
  { value: "lines", label: "Pickup lines", icon: Sparkles },
];

interface ModeSwitchProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
}

export function ModeSwitch({ mode, onChange, disabled }: ModeSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Choose what to generate"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-border/80 bg-muted/50 p-1"
    >
      {MODE_OPTIONS.map((option) => {
        const active = option.value === mode;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <Icon
              className={cn("h-3.5 w-3.5", active ? "text-primary-foreground" : "text-muted-foreground/80")}
              strokeWidth={1.9}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}