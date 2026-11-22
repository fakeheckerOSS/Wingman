/**
 * Shared vocabulary and limits. Imported by both the client UI and the API
 * route, so keep this file free of server-only dependencies.
 */

export const TONES = [
  "Playful",
  "Smooth",
  "Funny",
  "Confident",
  "Sweet",
  "Direct",
] as const;

export type Tone = (typeof TONES)[number];

export const GOALS = [
  "Keep chatting",
  "Ask for number",
  "Ask on a date",
  "Revive a dead convo",
  "Politely decline",
] as const;

export type Goal = (typeof GOALS)[number];

export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_CONTEXT_CHARS = 800;
export const MAX_REPLIES = 5;

/** Accent dot colors used on tone badges; earthy, not neon. */
export const TONE_COLORS: Record<Tone, string> = {
  Playful: "#D97757",
  Smooth: "#B08444",
  Funny: "#A4653F",
  Confident: "#8A7558",
  Sweet: "#C06C7C",
  Direct: "#6F7D68",
};

export const GOAL_HINTS: Record<Goal, string> = {
  "Keep chatting": "Keep it light and open",
  "Ask for number": "Low-pressure handoff",
  "Ask on a date": "Easy yes or no",
  "Revive a dead convo": "Fresh, no guilt",
  "Politely decline": "Kind and clear",
};

export function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONES as readonly string[]).includes(value);
}

export function isGoal(value: unknown): value is Goal {
  return typeof value === "string" && (GOALS as readonly string[]).includes(value);
}
