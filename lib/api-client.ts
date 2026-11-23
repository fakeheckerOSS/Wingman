import type { GenerateRequest, GenerateResult } from "@/lib/types";

export class WingmanApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WingmanApiError";
    this.status = status;
  }
}

export async function requestReplies(input: GenerateRequest): Promise<GenerateResult> {
  const form = new FormData();

  for (const image of input.images) {
    form.append("images", image);
  }
  form.append("context", input.context);
  form.append("tones", JSON.stringify(input.tones));
  form.append("goal", input.goal);
  form.append("mode", input.mode);

  if (input.exclude?.length) {
    form.append("exclude", JSON.stringify(input.exclude));
  }
  if (input.single) {
    form.append("single", "true");
  }

  let response: Response;
  try {
    response = await fetch("/api/generate", { method: "POST", body: form });
  } catch {
    throw new WingmanApiError("Couldn't reach Wingman. Check your connection and try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as
    | (GenerateResult & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new WingmanApiError(
      data?.error ?? "Something went wrong while generating replies. Try again.",
      response.status,
    );
  }

  if (!data || !Array.isArray((data as GenerateResult).replies)) {
    throw new WingmanApiError("Wingman sent back an unexpected response. Try again.", 502);
  }

  return data as GenerateResult;
}
