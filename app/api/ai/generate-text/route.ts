import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, slideContext, type } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const systemPrompt = `You are an expert presentation content writer. Generate concise, impactful slide content.

Rules:
- Keep text brief and scannable
- Use bullet points for body text (separate with \\n)
- Title should be 3-8 words
- Body text should have 3-6 bullet points max
- Each bullet should be 1 line

Respond with valid JSON: { "title": "...", "body": "bullet 1\\nbullet 2\\n..." }`;

  const userPrompt = `Generate slide content for: "${prompt}"
${slideContext ? `Context from other slides: ${slideContext}` : ""}
${type === "title" ? "This is for the slide title only" : ""}
${type === "body" ? "This is for the slide body/bullet points only" : ""}`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 1024 }
    );

    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const content = JSON.parse(cleaned);

    return NextResponse.json(content);
  } catch (error) {
    console.error("Generate text error:", error);
    return NextResponse.json(
      { error: "Failed to generate text" },
      { status: 500 }
    );
  }
}
