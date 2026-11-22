"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TONE_COLORS, type Tone } from "@/lib/constants";
import type { Reply } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReplyCardProps {
  reply: Reply;
  index: number;
  busy: boolean;
  disabled: boolean;
  onRegenerate: (reply: Reply) => void;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers or non-secure contexts: fall back to a hidden textarea.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function ReplyCard({ reply, index, busy, disabled, onRegenerate }: ReplyCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(reply.text);
    if (!ok) return;

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const dotColor = TONE_COLORS[reply.tone as Tone] ?? "#D97757";

  return (
    <article
      style={{ animationDelay: `${index * 70}ms` }}
      className="animate-fade-up rounded-2xl border border-border/90 bg-card p-4 shadow-warm transition-colors duration-200 hover:border-primary/25 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className="border-border/80 bg-background/40">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          {reply.tone}
        </Badge>

        <div className="-mr-1.5 -mt-1 flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              "min-w-[74px] gap-1.5 text-muted-foreground hover:text-foreground",
              copied && "text-primary hover:text-primary",
            )}
            aria-label={copied ? "Reply copied" : "Copy reply"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-200" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRegenerate(reply)}
            disabled={disabled || busy}
            aria-label={busy ? "Regenerating reply" : "Regenerate this reply"}
            title="Regenerate this reply"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-2.5 text-[16px] leading-relaxed tracking-[-0.005em] text-foreground/90 sm:text-[16.5px]">
        {reply.text}
      </p>
    </article>
  );
}
