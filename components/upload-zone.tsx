"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Lock, Plus, X } from "lucide-react";

import { MAX_IMAGES } from "@/lib/constants";
import type { UploadedImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  images: UploadedImage[];
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  error: string | null;
  disabled?: boolean;
}

export function UploadZone({ images, onFiles, onRemove, error, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  // Global paste so a screenshot can be dropped in from anywhere on the page.
  useEffect(() => {
    if (disabled) return;

    function handlePaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length > 0) {
        event.preventDefault();
        onFiles(files);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, onFiles]);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    onFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    if (!disabled) setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  const dragHandlers = {
    onDragEnter: handleDragEnter,
    onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        aria-label="Upload chat screenshots"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          onFiles(files);
        }}
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          {...dragHandlers}
          className={cn(
            "group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center transition-colors duration-200",
            "hover:border-primary/45 hover:bg-accent/40",
            dragging && "border-primary bg-accent/60",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span
            className={cn(
              "mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-0.5",
              dragging && "-translate-y-1 scale-105",
            )}
          >
            <ImagePlus className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="text-sm font-medium text-foreground">
            {dragging ? "Drop it right here" : "Drop your screenshot here"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            or click to browse · paste with{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[10px] font-medium text-foreground/70">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[10px] font-medium text-foreground/70">
              V
            </kbd>
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            Never stored · PNG, JPG, WEBP · 5 MB · up to {MAX_IMAGES}
          </span>
        </button>
      ) : (
        <div
          {...dragHandlers}
          className={cn(
            "rounded-2xl border border-dashed border-border bg-background/40 p-2 transition-colors",
            dragging && "border-primary bg-accent/60",
          )}
        >
          <div className="flex items-center gap-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                title={`Screenshot ${index + 1}`}
                className="group relative h-[72px] w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
              >
                {/* Blob URLs are revoked when the image is removed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.preview}
                  alt={`Chat screenshot ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-[9px] font-medium leading-none text-background backdrop-blur-sm">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(image.id)}
                  disabled={disabled}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-lg bg-foreground/85 text-background shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive focus-visible:opacity-100"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                aria-label="Add another screenshot"
                className="grid h-[72px] w-16 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-2">
            <span className="text-[10.5px] text-muted-foreground">
              {images.length} of {MAX_IMAGES} · drag more in or paste
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Not stored
            </span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 px-1 text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
