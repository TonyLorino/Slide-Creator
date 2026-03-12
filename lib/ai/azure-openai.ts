const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? "";
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? "";
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
const AZURE_IMAGE_DEPLOYMENT =
  process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT ?? "gpt-image-1.5";
const API_VERSION = "2025-04-01-preview";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
  }
): Promise<string> {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

  const body: Record<string, unknown> = {
    messages,
    temperature: options?.temperature ?? 0.7,
    max_completion_tokens: options?.maxTokens ?? 2048,
  };

  if (options?.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Generate an image using gpt-image-1.5 via the responses API.
 * This model uses a different endpoint than DALL-E -- it goes through
 * the /responses endpoint with modality: ["text", "image"].
 */
export async function generateImage(
  prompt: string,
  options?: { size?: string; quality?: string }
): Promise<string> {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_IMAGE_DEPLOYMENT}/images/generations?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_API_KEY,
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: options?.size ?? "1024x1024",
      quality: options?.quality ?? "medium",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Azure image generation error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();

  // gpt-image models return base64 in data[0].b64_json by default,
  // or a URL in data[0].url depending on response_format
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }

  throw new Error("No image data returned from Azure OpenAI");
}
