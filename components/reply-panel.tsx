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
import type { Reply } from "@/lib/types";

export type Phase = "idle" | "loading" | "ready" | "error";

interface ReplyPanelProps {
  phase: Phase;
  read: string;
  replies: Reply[];
  error: string | null;
  busyId: string | null;
  generatingMore: boolean;
  onRegenerate: (reply: Reply) => void;
  onGenerateMore: () => void;
  onRetry: () => void;
}

function EmptyState() {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/90 bg-card/35 px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-primary/20 bg-card text-primary shadow-warm">
          <MessageCircleHeart className="h-7 w-7" strokeWidth={1.6} />
        </div>
        <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-primary shadow-sm">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
      </div>

      <h3 className="text-balance text-lg font-semibold tracking-tight">
        Your wingman is standing by
      </h3>
      <p className="mt-2 max-w-[300px] text-balance text-sm leading-relaxed text-muted-foreground">
        Add a screenshot and a little context. I&apos;ll read the room and draft replies
        that sound like you — warm, witty, never cringe.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5 opacity-80">
        {["Playful", "Smooth", "Sweet"].map((tone) => (
          <Badge key={tone} variant="muted" className="bg-card text-[11px]">
            {tone}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeletons() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-primary/60" />
          <Skeleton className="h-2.5 w-32 bg-primary/10" />
        </div>
        <Skeleton className="mt-3 h-3 w-full max-w-[420px] bg-primary/10" />
        <Skeleton className="mt-1.5 h-3 w-3/5 max-w-[300px] bg-primary/10" />
      </div>

      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/80 bg-card p-5 shadow-warm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ReplyPanel({
  phase,
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
            The wingman take
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            Replies worth sending
          </h2>
        </div>
        {phase === "ready" && replies.length > 0 && (
          <Badge variant="muted" className="mb-0.5 shrink-0">
            {replies.length} {replies.length === 1 ? "draft" : "drafts"}
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Reading the room and drafting a few options…
        </div>
      )}

      {isLoading ? (
        <LoadingSkeletons />
      ) : isFatalError ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 px-6 py-14 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-semibold tracking-tight">Couldn&apos;t read that one</h3>
          <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-muted-foreground">
            {error ?? "Something got lost in translation. Try again in a moment."}
          </p>
          <Button type="button" variant="outline" onClick={onRetry} className="mt-6">
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : phase === "idle" ? (
        <EmptyState />
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

          {read && (
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
              {generatingMore ? "Writing a few more…" : "Generate more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
