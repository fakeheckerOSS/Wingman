/**
 * Minimal OpenAI-compatible chat-completions client. Only the pieces Wingman
 * needs: a system prompt, one multimodal user message, and strict JSON output.
 */

export interface ModelImage {
  dataUrl: string;
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "assistant"; content: string }
  | { role: "user"; content: string | Array<Record<string, unknown>> };

export class ModelRequestError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ModelRequestError";
    this.status = status;
  }
}

export class InvalidModelOutputError extends Error {
  raw: string;

  constructor(raw: string) {
    super("The model returned a response that was not valid JSON.");
    this.name = "InvalidModelOutputError";
    this.raw = raw;
  }
}

export interface ParsedReply {
  tone: string;
  text: string;
}

export interface ParsedModelOutput {
  error?: string;
  read: string;
  replies: ParsedReply[];
}

/** Accept either ".../v1" or a full ".../chat/completions" URL. */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function buildVisionMessages(
  systemPrompt: string,
  userPrompt: string,
  images: ModelImage[],
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        ...images.map((image) => ({
          type: "image_url",
          image_url: { url: image.dataUrl },
        })),
      ],
    },
  ];
}

export async function callChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}): Promise<string> {
  const url = resolveChatCompletionsUrl(baseUrl);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 4000,
        stream: false,
      }),
      signal: AbortSignal.timeout(75_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ModelRequestError("The model took too long to respond. Try again.", 504);
    }
    throw new ModelRequestError(
      "Could not reach the AI provider. Check AI_BASE_URL and your connection.",
      502,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[wingman] model request failed: ${response.status} ${response.statusText}`,
      body.slice(0, 500),
    );

    const friendly =
      response.status === 401 || response.status === 403
        ? "The AI provider rejected the API key. Check AI_API_KEY."
        : response.status === 404
          ? "The AI endpoint or model was not found. Check AI_BASE_URL and AI_MODEL."
          : response.status === 429
            ? "The AI provider is rate-limiting requests. Wait a moment and try again."
            : "The AI provider could not complete the request. Try again.";

    throw new ModelRequestError(friendly, response.status === 429 ? 429 : 502);
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) return content;

  // A few providers return content as an array of parts.
  if (Array.isArray(content)) {
    const joined = content
      .map((part) =>
        typeof part === "object" && part && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : "",
      )
      .join("")
      .trim();
    if (joined) return joined;
  }

  throw new ModelRequestError("The model returned an empty response. Try again.", 502);
}

/** Strip code fences, then isolate the outermost JSON object. */
export function parseModelOutput(raw: string): ParsedModelOutput {
  let text = raw.trim().replace(/^\uFEFF/, "");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) text = fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new InvalidModelOutputError(raw);
  const candidate = text.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new InvalidModelOutputError(raw);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidModelOutputError(raw);
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.error === "string" && record.error.trim()) {
    return { error: record.error.trim().slice(0, 300), read: "", replies: [] };
  }

  if (!Array.isArray(record.replies)) throw new InvalidModelOutputError(raw);

  const seen = new Set<string>();
  const replies: ParsedReply[] = [];

  for (const item of record.replies) {
    if (!item || typeof item !== "object") continue;
    const reply = item as Record<string, unknown>;
    if (typeof reply.text !== "string") continue;
    const text = reply.text.trim().replace(/^["']([\s\S]+)["']$/, "$1").slice(0, 800);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    replies.push({
      tone: typeof reply.tone === "string" ? reply.tone.trim().slice(0, 30) : "",
      text,
    });
    if (replies.length >= 8) break;
  }

  if (replies.length === 0) throw new InvalidModelOutputError(raw);

  const read =
    typeof record.read === "string" && record.read.trim()
      ? record.read.trim().slice(0, 500)
      : "There is room to keep the conversation moving — keep it light and specific.";

  return { read, replies };
}
