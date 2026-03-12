import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, slideCount, audience, tone } = await request.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const systemPrompt = `You are an expert presentation designer. Generate a detailed slide-by-slide outline for a PowerPoint deck.

For each slide, provide:
- slideNumber (1-based)
- layoutSuggestion (one of: "Title 2", "Slide Content", "2 Column Content", "Copy + Image", "Divider White", "Statement 1", "Title Content Bold (NEW)", "Close 1")
- title (slide title text)
- body (bullet points or body text, use \\n for line breaks)
- notes (optional speaker notes)

Respond with valid JSON only: { "title": "Deck Title", "slides": [...] }`;

  const userPrompt = `Create a ${slideCount || 10}-slide presentation about: "${topic}"
${audience ? `Target audience: ${audience}` : ""}
${tone ? `Tone: ${tone}` : "Tone: Professional"}

Start with a title slide, include a contents/agenda slide, use divider slides between sections, and end with a closing slide. Make the content substantive and specific.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 4096 }
    );

    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const outline = JSON.parse(cleaned);

    return NextResponse.json(outline);
  } catch (error) {
    console.error("Generate outline error:", error);
    return NextResponse.json(
      { error: "Failed to generate outline" },
      { status: 500 }
    );
  }
}
