import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, maxSlides } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const systemPrompt = `You are an expert at distilling long documents into concise slide-ready content.

Given a long text, extract the key points and organize them into slide-sized chunks.
Each slide should have a clear title and 3-6 bullet points.

Respond with valid JSON:
{
  "slides": [
    {
      "title": "slide title",
      "body": "bullet 1\\nbullet 2\\nbullet 3",
      "layoutSuggestion": "Slide Content"
    }
  ]
}`;

  const userPrompt = `Summarize the following text into ${maxSlides || 5} slides of presentation content:

${text.substring(0, 8000)}`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 4096 }
    );

    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const summary = JSON.parse(cleaned);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to summarize text" },
      { status: 500 }
    );
  }
}
