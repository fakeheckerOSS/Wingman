import { NextResponse } from "next/server";

import {
  isGoal,
  isTone,
  MAX_CONTEXT_CHARS,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  PICKUP_LINE_COUNT,
  REPLY_DRAFT_COUNT,
  type Goal,
  type Mode,
  type Tone,
} from "@/lib/constants";
import {
  buildPickupLinesPrompt,
  buildUserPrompt,
  PICKUP_LINES_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from "@/lib/prompt";
import {
  buildVisionMessages,
  callChatCompletion,
  InvalidModelOutputError,
  ModelRequestError,
  parseModelOutput,
  type ChatMessage,
  type ParsedModelOutput,
} from "@/lib/server/openai";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

// formData(), Buffer, and AbortSignal.timeout need the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 120;

const NO_STORE = "no-store, max-age=0";

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": NO_STORE, ...headers } },
  );
}

/** Verify the actual bytes, not just the browser-supplied MIME type. */
async function detectImageMime(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }

  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }

  // RIFF....WEBP
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function parseTones(raw: string): Tone[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter(isTone)));
  } catch {
    return [];
  }
}

function parseExcludedReplies(raw: string): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().slice(0, 600))
          .filter(Boolean),
      ),
    ).slice(0, 12);
  } catch {
    return [];
  }
}

/**
 * One model call; if the JSON is malformed, repair once by showing the model
 * its own output. This is the "retry once" behavior the UI relies on.
 */
async function requestParsedReplies(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[],
): Promise<ParsedModelOutput> {
  const first = await callChatCompletion({ ...config, messages });

  try {
    return parseModelOutput(first);
  } catch (error) {
    if (!(error instanceof InvalidModelOutputError)) throw error;

    console.warn(`[wingman] malformed model JSON (${error.raw.length} chars); retrying once`);

    const repairMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: error.raw.slice(0, 8000) },
      {
        role: "user",
        content:
          "That response was not valid JSON. Reply with the complete corrected object now. Only the JSON object: no markdown, no code fences, no commentary.",
      },
    ];

    const second = await callChatCompletion({ ...config, messages: repairMessages });
    return parseModelOutput(second);
  }
}

export async function POST(request: Request) {
  const rate = checkRateLimit(getClientIp(request.headers));
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
  };

  if (!rate.allowed) {
    return jsonError(
      `You've hit the limit for now. Try again in about ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    console.error("[wingman] missing AI_BASE_URL, AI_API_KEY, or AI_MODEL");
    return jsonError(
      "The server is missing AI configuration. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL.",
      500,
      rateHeaders,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Could not read the upload. Please try again.", 400, rateHeaders);
  }

  const images = form.getAll("images").filter((item): item is File => typeof item !== "string");

  const mode: Mode = formString(form, "mode") === "lines" ? "lines" : "replies";
  const isLines = mode === "lines";

  if (!isLines && images.length === 0) {
    return jsonError("Add at least one chat screenshot.", 400, rateHeaders);
  }
  if (images.length > MAX_IMAGES) {
    return jsonError(`You can upload up to ${MAX_IMAGES} screenshots at a time.`, 400, rateHeaders);
  }

  const context = formString(form, "context").trim();
  if (context.length > MAX_CONTEXT_CHARS) {
    return jsonError(
      `Context is too long. Keep it under ${MAX_CONTEXT_CHARS} characters.`,
      400,
      rateHeaders,
    );
  }

  const tones = parseTones(formString(form, "tones"));
  if (tones.length === 0) {
    return jsonError("Pick at least one tone.", 400, rateHeaders);
  }

  let goalValue: Goal = "Keep chatting";
  if (!isLines) {
    const rawGoal = formString(form, "goal");
    if (!isGoal(rawGoal)) {
      return jsonError("Pick a valid goal.", 400, rateHeaders);
    }
    goalValue = rawGoal;
  }

  const single = formString(form, "single") === "true";
  const exclude = parseExcludedReplies(formString(form, "exclude"));
  const replyCount = single ? 1 : isLines ? PICKUP_LINE_COUNT : REPLY_DRAFT_COUNT;

  const imageData: { dataUrl: string }[] = [];

  for (const image of images) {
    if (image.size === 0) {
      return jsonError("One of the screenshots is empty. Try another file.", 400, rateHeaders);
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return jsonError("Each screenshot must be 5 MB or smaller.", 413, rateHeaders);
    }

    const mime = await detectImageMime(image);
    if (!mime) {
      return jsonError("Only PNG, JPG, and WEBP screenshots are supported.", 415, rateHeaders);
    }

    // Held in memory only and sent straight to the model.
    const bytes = Buffer.from(await image.arrayBuffer());
    imageData.push({ dataUrl: `data:${mime};base64,${bytes.toString("base64")}` });
  }

  const userPrompt = isLines
    ? buildPickupLinesPrompt({ context, tones, exclude, single, replyCount })
    : buildUserPrompt({
        context,
        tones,
        goal: goalValue,
        exclude,
        single,
        replyCount,
      });

  const systemPrompt = isLines ? PICKUP_LINES_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const messages = buildVisionMessages(systemPrompt, userPrompt, imageData);

  let output: ParsedModelOutput;
  try {
    output = await requestParsedReplies({ baseUrl, apiKey, model }, messages);
  } catch (error) {
    if (error instanceof ModelRequestError) {
      return jsonError(error.message, error.status, rateHeaders);
    }
    if (error instanceof InvalidModelOutputError) {
      console.error("[wingman] model returned invalid JSON after retry");
      return jsonError(
        "Wingman couldn't format the reply this time. Please try again.",
        502,
        rateHeaders,
      );
    }
    console.error("[wingman] unexpected generation error", error);
    return jsonError("Something went wrong while generating replies.", 500, rateHeaders);
  }

  if (output.error) {
    return jsonError(output.error, 422, rateHeaders);
  }

  const replies = output.replies.slice(0, replyCount).map((reply) => {
    const match = tones.find((tone) => tone.toLowerCase() === reply.tone.toLowerCase());
    return { tone: match ?? tones[0], text: reply.text };
  });

  if (replies.length === 0) {
    return jsonError(
      isLines
        ? "Wingman couldn't come up with pickup lines this time. Try again."
        : "Wingman couldn't find a reply in that screenshot. Try another one.",
      422,
      rateHeaders,
    );
  }

  console.info(`[wingman] generated ${replies.length} reply/replies from ${images.length} image(s)`);

  return NextResponse.json(
    { read: output.read, replies },
    { headers: { "Cache-Control": NO_STORE, ...rateHeaders } },
  );
}
