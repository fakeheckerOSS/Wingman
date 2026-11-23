"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";

import { GoalSelector } from "@/components/goal-selector";
import { ModeSwitch } from "@/components/mode-switch";
import { ReplyPanel, type Phase } from "@/components/reply-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToneSelector } from "@/components/tone-selector";
import { UploadZone } from "@/components/upload-zone";
import { WingMark } from "@/components/wing-mark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestReplies } from "@/lib/api-client";
import {
  ACCEPTED_IMAGE_TYPES,
  isTone,
  MAX_CONTEXT_CHARS,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  type Goal,
  type Mode,
  type Tone,
} from "@/lib/constants";
import type { Reply, UploadedImage } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<Mode>("replies");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const imagesRef = useRef<UploadedImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [context, setContext] = useState("");
  const [tones, setTones] = useState<Tone[]>(["Playful", "Smooth"]);
  const [goal, setGoal] = useState<Goal>("Keep chatting");

  const [phase, setPhase] = useState<Phase>("idle");
  const [read, setRead] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);

  const outputRef = useRef<HTMLElement>(null);

  const isLines = mode === "lines";

  // Keep the ref in sync for callbacks that must not re-subscribe (paste, unmount).
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.preview);
    };
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setUploadError(null);
    if (incoming.length === 0) return;

    const current = imagesRef.current;
    const room = MAX_IMAGES - current.length;

    if (room <= 0) {
      setUploadError(`You can add up to ${MAX_IMAGES} screenshots. Remove one first.`);
      return;
    }

    const accepted: UploadedImage[] = [];
    const problems: string[] = [];

    for (const file of incoming) {
      if (accepted.length >= room) {
        problems.push(`Only ${MAX_IMAGES} screenshots at a time — extra files were skipped.`);
        break;
      }

      const typeLooksValid =
        (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type) ||
        /\.(png|jpe?g|webp)$/i.test(file.name);

      if (!typeLooksValid) {
        problems.push(`${file.name || "That file"} isn't a PNG, JPG, or WEBP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name || "That image"} is over 5 MB.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name || "That image"} looks empty.`);
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) {
      const next = [...current, ...accepted];
      imagesRef.current = next;
      setImages(next);
    }

    if (problems.length > 0) {
      const extra = problems.length > 1 ? ` (+${problems.length - 1} more issue${problems.length > 2 ? "s" : ""})` : "";
      setUploadError(`${problems[0]}${extra}`);
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    const current = imagesRef.current;
    const target = current.find((image) => image.id === id);
    if (target) URL.revokeObjectURL(target.preview);

    const next = current.filter((image) => image.id !== id);
    imagesRef.current = next;
    setImages(next);
    setUploadError(null);
  }, []);

  function toggleTone(tone: Tone) {
    setTones((previous) => {
      if (previous.includes(tone)) {
        // Keep at least one tone selected so the request is always valid.
        if (previous.length === 1) return previous;
        return previous.filter((item) => item !== tone);
      }
      return [...previous, tone];
    });
  }

  function changeMode(next: Mode) {
    if (next === mode) return;

    setMode(next);
    setPhase("idle");
    setRead("");
    setReplies([]);
    setError(null);
    setUploadError(null);
  }

  async function handleGenerate() {
    if (!isLines && images.length === 0) {
      setUploadError("Add a screenshot first.");
      return;
    }

    setPhase("loading");
    setError(null);
    setRead("");
    setReplies([]);

    try {
      const result = await requestReplies({
        images: isLines ? [] : images.map((image) => image.file),
        context,
        tones,
        goal,
        mode,
      });

      setRead(result.read);
      setReplies(
        result.replies.map((reply) => ({
          id: crypto.randomUUID(),
          tone: isTone(reply.tone) ? reply.tone : tones[0],
          text: reply.text,
        })),
      );
      setPhase("ready");

      if (window.matchMedia("(max-width: 1023px)").matches) {
        window.setTimeout(() => {
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      setPhase("error");
    }
  }

  async function handleRegenerate(reply: Reply) {
    if (busyId || generatingMore || phase === "loading") return;

    setBusyId(reply.id);
    setError(null);

    try {
      const result = await requestReplies({
        images: isLines ? [] : images.map((image) => image.file),
        context,
        tones: [isTone(reply.tone) ? reply.tone : tones[0]],
        goal,
        mode,
        exclude: replies.map((item) => item.text),
        single: true,
      });

      const fresh = result.replies[0];
      if (!fresh) throw new Error("No new reply came back. Try again.");

      setReplies((previous) =>
        previous.map((item) =>
          item.id === reply.id ? { ...item, text: fresh.text } : item,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't regenerate that reply.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateMore() {
    if (generatingMore || busyId || phase === "loading") return;

    setGeneratingMore(true);
    setError(null);

    try {
      const result = await requestReplies({
        images: isLines ? [] : images.map((image) => image.file),
        context,
        tones,
        goal,
        mode,
        exclude: replies.map((item) => item.text),
      });

      if (result.replies.length === 0) throw new Error("No new replies came back. Try again.");

      setReplies((previous) => [
        ...previous,
        ...result.replies.map((reply) => ({
          id: crypto.randomUUID(),
          tone: isTone(reply.tone) ? reply.tone : tones[0],
          text: reply.text,
        })),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't write more replies.");
    } finally {
      setGeneratingMore(false);
    }
  }

  const busy = phase === "loading" || busyId !== null || generatingMore;
  const canGenerate = !busy && (isLines || images.length > 0);
  const generateHint = isLines
    ? context.trim().length === 0
      ? "Add a detail or two about them for lines that actually land."
      : null
    : images.length === 0
      ? "Add a screenshot to get started."
      : null;

  function renderGenerateButton(className?: string) {
    return (
      <Button
        type="button"
        size="lg"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={className}
      >
        {phase === "loading" ? (
          <>
            <Loader2 className="animate-spin" />
            {isLines ? "Cooking up lines…" : "Reading the room…"}
          </>
        ) : (
          <>
            <Sparkles />
            {isLines ? "Generate pickup lines" : "Generate replies"}
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 pb-2 pt-5 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-warm">
            <WingMark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-none tracking-[-0.03em]">
              Wingman
            </h1>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              Reply better. Overthink less.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8 lg:pb-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <section
            aria-labelledby="input-heading"
            className="flex flex-col rounded-3xl border border-border/80 bg-card/80 p-5 shadow-warm backdrop-blur-sm sm:p-6 lg:min-h-[680px]"
          >
            <div className="mb-3">
              <h2 id="input-heading" className="text-[15px] font-semibold tracking-tight">
                {isLines ? "The opener" : "The conversation"}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {isLines ? "Tell me about them, I'll bring the lines." : "Drop in a chat, tell me the vibe."}
              </p>
            </div>

            <div className="mb-3">
              <ModeSwitch mode={mode} onChange={changeMode} disabled={phase === "loading"} />
            </div>

            <div className="space-y-3.5">
              {!isLines && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">Screenshot</span>
                    <span className="text-[11px] text-muted-foreground">
                      {images.length}/{MAX_IMAGES}
                    </span>
                  </div>
                  <UploadZone
                    images={images}
                    onFiles={addFiles}
                    onRemove={removeImage}
                    error={uploadError}
                    disabled={phase === "loading"}
                  />
                </div>
              )}

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <label
                    htmlFor="context"
                    className="text-[13px] font-medium text-foreground"
                  >
                    {isLines ? (
                      "Who are they?"
                    ) : (
                      <>
                        Context{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </>
                    )}
                  </label>
                  {context.length > 0 && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {context.length}/{MAX_CONTEXT_CHARS}
                    </span>
                  )}
                </div>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  maxLength={MAX_CONTEXT_CHARS}
                  rows={2}
                  className="min-h-[64px]"
                  placeholder={
                    isLines
                      ? 'e.g. "They love hiking, iced coffee, and terrible puns. We matched on Hinge."'
                      : 'e.g. "We matched yesterday. They like hiking and bad puns."'
                  }
                />
              </div>

              <ToneSelector selected={tones} onToggle={toggleTone} />
              {!isLines && <GoalSelector selected={goal} onChange={setGoal} />}
            </div>

            <div className="sticky bottom-4 z-10 mt-auto -mx-5 -mb-5 hidden rounded-b-3xl border-t border-border/70 bg-card/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 lg:block">
              {generateHint && (
                <p className="mb-2 text-center text-[10.5px] text-muted-foreground">
                  {generateHint}
                </p>
              )}
              {renderGenerateButton("w-full")}
            </div>
          </section>

          <section
            ref={outputRef}
            className="min-w-0 scroll-mt-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1"
          >
            <ReplyPanel
              phase={phase}
              mode={mode}
              read={read}
              replies={replies}
              error={error}
              busyId={busyId}
              generatingMore={generatingMore}
              onRegenerate={handleRegenerate}
              onGenerateMore={handleGenerateMore}
              onRetry={handleGenerate}
            />
          </section>
        </div>

        <footer className="mx-auto mt-12 max-w-2xl border-t border-border/60 pt-6 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Made for better conversations. AI drafts can miss the mark — you know the
            context best.
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            No accounts, no saved chats. Screenshots are processed in memory only.
          </p>
        </footer>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        {generateHint && (
          <p className="mb-2 text-center text-[10.5px] text-muted-foreground">{generateHint}</p>
        )}
        {renderGenerateButton("w-full")}
      </div>
    </div>
  );
}
