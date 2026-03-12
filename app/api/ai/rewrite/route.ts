import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, tone, instruction } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const toneDescriptions: Record<string, string> = {
    professional: "formal, authoritative business language",
    concise: "shorter, more direct, remove filler words",
    persuasive: "compelling, action-oriented, with strong verbs",
    simplified: "plain language, easy to understand, shorter sentences",
    creative: "engaging, memorable, with vivid language",
  };

  const toneGuide = toneDescriptions[tone] || toneDescriptions.professional;

  const systemPrompt = `You are a professional editor specializing in presentation content. Rewrite the given text according to the instructions while preserving the core meaning.

Respond with valid JSON: { "text": "rewritten text here" }
If the input has multiple lines/bullets, preserve the line structure.`;

  const userPrompt = `Rewrite this text with ${toneGuide}:

"${text}"

${instruction ? `Additional instruction: ${instruction}` : ""}`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 1024 }
    );

    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const rewritten = JSON.parse(cleaned);

    return NextResponse.json(rewritten);
  } catch (error) {
    console.error("Rewrite error:", error);
    return NextResponse.json(
      { error: "Failed to rewrite text" },
      { status: 500 }
    );
  }
}
