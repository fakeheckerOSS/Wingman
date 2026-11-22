const FALLBACK_URL = "http://localhost:3000";

export const SITE_DESCRIPTION =
  "Upload a screenshot of your chat and get a few short, natural replies in your chosen tone. Private by design: screenshots are processed in memory and never stored.";

/** NEXT_PUBLIC_SITE_URL is optional; fall back gracefully to localhost. */
export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return new URL(FALLBACK_URL);
  try {
    return new URL(raw);
  } catch {
    return new URL(FALLBACK_URL);
  }
}
