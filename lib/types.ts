import type { Goal, Mode, Tone } from "@/lib/constants";

export interface Reply {
  id: string;
  tone: string;
  text: string;
}

export interface GenerateResult {
  read: string;
  replies: { tone: string; text: string }[];
}

export interface GenerateRequest {
  images: File[];
  context: string;
  tones: Tone[];
  goal: Goal;
  mode: Mode;
  /** Replies already on screen, so the model produces something new. */
  exclude?: string[];
  /** Regenerate a single card in one tone. */
  single?: boolean;
  /** Ask for a shorter version of a single reply. */
  shorter?: boolean;
}

/** Client-only preview record; never sent to the API as-is. */
export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}
