"use client";

import {
  AlertCircle,
  Eye,
  Loader2,
  MessageCircleHeart,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { ReplyCard } from "@/components/reply-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PICKUP_LINE_COUNT,
  REPLY_DRAFT_COUNT,
  TONE_COLORS,
  type Mode,
  type Tone,
} from "@/lib/constants";
import type { Reply } from "@/lib/types";

export type Phase = "idle" | "loading" | "ready" | "error";

interface ReplyPanelProps {
  phase: Phase;
  mode: Mode;
  read: string;
  replies: Reply[];
  error: string | null;
  busyId: string | null;
  generatingMore: boolean;
  onRegenerate: (reply: Reply) => void;
  onGenerateMore: () => void;
  onRetry: () => void;
}

type Sample = { tone: Tone; text: string };

const REPLY_SAMPLES: Sample[] = [
  {
    tone: "Playful",
    text: "Important question: is that smile always this distracting, or just when you're trying to get away with something?",
  },
  {
    tone: "Smooth",
    text: "I was going to play it cool, but you're making that really hard.",
  },
  {
    tone: "Sweet",
    text: "You have this way of making a random Tuesday feel like something worth looking forward to.",
  },
];

const LINE_SAMPLES: Sample[] = [
  {
    tone: "Smooth",
    text: "I was going to play it cool, but you make that impossible.",
  },
  {
    tone: "Funny",
    text: "I'd open with something clever, but you've clearly already raised the bar.",
  },
  {
    tone: "Sweet",
    text: "If you were a coffee, you'd be the reason I wake up early.",
  },
];

function SampleCard({ sample, index }: { sample: Sample; index: number }) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: `${index * 70}ms` }}
      className="animate-fade-up select-none rounded-2xl border border-border/70 bg-card/70 p-3.5 opacity-70 shadow-sm"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: TONE_COLORS[sample.tone] }}
        />
        {sample.tone}
      </span>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/75">{sample.text}</p>
    </div>
  );
}

function EmptyState({ mode }: { mode: Mode }) {
  const isLines = mode === "lines";
  const samples = isLines ? LINE_SAMPLES : REPLY_SAMPLES;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/90 bg-card/35 px-6 py-10 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-card text-primary shadow-warm">
          {isLines ? (
            <Sparkles className="h-6 w-6" strokeWidth={1.6} />
          ) : (
            <MessageCircleHeart className="h-6 w-6" strokeWidth={1.6} />
          )}
        </div>
      </div>

      <h3 className="text-balance text-lg font-semibold tracking-tight">
        {isLines ? "Your wingman has lines" : "Your wingman is standing by"}
      </h3>
      <p className="mt-1.5 max-w-[330px] text-balance text-sm leading-relaxed text-muted-foreground">
        {isLines
          ? "Tell me who you're into and the vibe you want. Here's a taste of what you'll get:"
          : "Add a screenshot and a little context. Here's a taste of what you'll get:"}
      </p>

      <div className="mt-5 w-full space-y-2.5 text-left">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
          Examples
        </p>
        {samples.map((sample, index) => (
          <SampleCard key={sample.text} sample={sample} index={index} />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeletons({ mode }: { mode: Mode }) {
  const isLines = mode === "lines";
  const count = isLines ? PICKUP_LINE_COUNT : REPLY_DRAFT_COUNT;

  return (
    <div className="space-y-2.5">
      {!isLines && (
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3 text-primary/70" />
            <Skeleton className="h-2.5 w-32 bg-primary/15" />
          </div>
          <Skeleton className="mt-2.5 h-3 w-full max-w-[420px] bg-primary/15" />
          <Skeleton className="mt-1.5 h-3 w-3/5 max-w-[300px] bg-primary/15" />
        </div>
      )}

      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/80 bg-card p-4 shadow-warm"
        >
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="mt-3 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ReplyPanel({
  phase,
  mode,
  read,
  replies,
  error,
  busyId,
  generatingMore,
  onRegenerate,
  onGenerateMore,
  onRetry,
}: ReplyPanelProps) {
  const isLoading = phase === "loading";
  const isFatalError = phase === "error" && replies.length === 0;
  const isLines = mode === "lines";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
            {isLines ? "Fresh openers" : "The wingman take"}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            {isLines ? "Pickup lines worth sending" : "Replies worth sending"}
          </h2>
        </div>
        {phase === "ready" && replies.length > 0 && (
          <Badge variant="muted" className="mb-0.5 shrink-0">
            {replies.length} {replies.length === 1 ? (isLines ? "line" : "draft") : isLines ? "lines" : "drafts"}
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {isLines ? "Cooking up a few openers…" : "Reading the room and drafting a few options…"}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeletons mode={mode} />
      ) : isFatalError ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 px-6 py-14 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-semibold tracking-tight">
            {isLines ? "Couldn't write those lines" : "Couldn't read that one"}
          </h3>
          <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-muted-foreground">
            {error ?? "Something got lost in translation. Try again in a moment."}
          </p>
          <Button type="button" variant="outline" onClick={onRetry} className="mt-6">
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : phase === "idle" ? (
        <EmptyState mode={mode} />
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLines && read && (
            <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/[0.055] px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Eye className="h-3 w-3" />
                Read of the situation
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{read}</p>
            </div>
          )}

          <div className="space-y-3">
            {replies.map((reply, index) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                index={Math.min(index, 5)}
                busy={busyId === reply.id}
                disabled={busyId !== null || generatingMore}
                onRegenerate={onRegenerate}
              />
            ))}
          </div>

          {replies.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onGenerateMore}
              disabled={generatingMore || busyId !== null}
              className="mt-4 w-full border-dashed bg-card/50 text-muted-foreground hover:text-foreground"
            >
              {generatingMore ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              {generatingMore
                ? "Writing a few more…"
                : isLines
                  ? "Generate more lines"
                  : "Generate more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
