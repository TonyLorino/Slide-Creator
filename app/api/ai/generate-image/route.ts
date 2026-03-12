import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, size } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const rawUrl = await generateImage(prompt, {
      size: size ?? "1536x1024",
      quality: "medium",
    });

    if (!rawUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    if (rawUrl.startsWith("data:image/")) {
      const base64Data = rawUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${uuidv4()}.png`;
      const storagePath = `generated/${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("slide-images")
        .upload(storagePath, buffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ url: rawUrl });
      }

      const { data: publicUrl } = supabase.storage
        .from("slide-images")
        .getPublicUrl(storagePath);

      return NextResponse.json({ url: publicUrl.publicUrl });
    }

    return NextResponse.json({ url: rawUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generate image error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
