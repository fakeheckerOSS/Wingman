/**
 * Minimal OpenAI-compatible chat-completions client. Only the pieces Wingman
 * needs: a system prompt, one multimodal user message, and a single response.
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

export interface ParsedReply {
  tone: string;
  text: string;
}

/**
 * Classic, widely-supported emoji. Anything outside this set is dropped from
 * model output so newer glyphs never render as tofu boxes on older devices.
 */
const ALLOWED_EMOJI = new Set<number>([
  0x1f600, 0x1f603, 0x1f604, 0x1f601, 0x1f606, 0x1f605, 0x1f923, 0x1f602, 0x1f642,
  0x1f643, 0x1f609, 0x1f60a, 0x1f607, 0x1f970, 0x1f60d, 0x1f929, 0x1f618, 0x1f617,
  0x1f61a, 0x1f619, 0x1f61b, 0x1f61c, 0x1f92a, 0x1f61d, 0x1f61e, 0x1f620, 0x1f621,
  0x1f92f, 0x1f633, 0x1f635, 0x1f60f, 0x1f60c, 0x1f614, 0x1f62c, 0x1f644, 0x1f641,
  0x1f643, 0x1f611, 0x1f60e, 0x1f60b, 0x1f61f, 0x1f636, 0x1f60a, 0x1f970, 0x1f973,
  0x1f60e, 0x1f644, 0x1f648, 0x1f649, 0x1f64a, 0x1f440, 0x1f441, 0x1f440, 0x1f64c,
  0x1f64f, 0x1f44d, 0x1f44e, 0x1f44a, 0x1f44c, 0x1f44f, 0x1f4aa, 0x1f918, 0x1f91d,
  0x1f44b, 0x1f91c, 0x1f90c, 0x1f4af, 0x1f525, 0x1f4a5, 0x1f4ab, 0x2728, 0x2b50,
  0x1f31f, 0x1f320, 0x1f308, 0x2600, 0x26a1, 0x2764, 0x1f9e1, 0x1f49b, 0x1f49a,
  0x1f499, 0x1f49c, 0x1f5a4, 0x1f90d, 0x1f48b, 0x1f389, 0x1f38a, 0x1f382, 0x1f37b,
]);

const EMOJI_LIKE = /\p{Extended_Pictographic}/u;

/** Remove Extended_Pictographic characters outside the safe allowlist. */
function stripUnsupportedEmoji(text: string): string {
  let result = "";
  for (const char of text) {
    if (EMOJI_LIKE.test(char) && !ALLOWED_EMOJI.has(char.codePointAt(0) ?? -1)) {
      continue;
    }
    result += char;
  }
  return result;
}

export interface ParsedModelOutput {
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
        temperature: 1.0,
        top_p: 0.95,
        max_tokens: 32768,
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
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>;
  } | null;

  const firstChoice = payload?.choices?.[0];
  if (firstChoice?.finish_reason === "length") {
    console.warn("[wingman] model hit the max_tokens limit; output may be truncated");
  }

  const content = firstChoice?.message?.content;

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

/** Parse plain text output in the format:
 * READ: <text>
 * REPLY 1 (Tone): <text>
 * REPLY 2 (Tone): <text>
 * REPLY 3 (Tone): <text>
 */
export function parseResponse(raw: string): ParsedModelOutput {
  const text = raw.trim().replace(/^\uFEFF/, "");

  // Find READ line
  const readMatch = text.match(/^READ:\s*(.+)$/im);
  const read = readMatch?.[1]?.trim() ?? "There is room to keep the conversation moving — keep it light and specific.";

  // Find all REPLY lines
  const replyRegex = /^REPLY\s+\d+\s*\(([^)]+)\):\s*([\s\S]*?)(?=^REPLY\s+\d+\s*\(|$)/gim;
  const seen = new Set<string>();
  const replies: ParsedReply[] = [];

  let match;
  while ((match = replyRegex.exec(text)) !== null) {
    const tone = match[1].trim().slice(0, 30);
    let replyText = match[2].trim().replace(/^["']([\s\S]+)["']$/, "$1");
    // Convert literal \n to actual newlines
    replyText = replyText.replace(/\\n/g, "\n");
    replyText = stripUnsupportedEmoji(replyText).slice(0, 800);
    if (!replyText) continue;
    const key = replyText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    replies.push({ tone, text: replyText });
    if (replies.length >= 8) break;
  }

  if (replies.length === 0) throw new Error("Invalid output format");

  return { read, replies };
}
