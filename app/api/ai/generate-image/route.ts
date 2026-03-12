import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, size } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const imageUrl = await generateImage(prompt, {
      size: size ?? "1792x1024",
      quality: "standard",
    });

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
