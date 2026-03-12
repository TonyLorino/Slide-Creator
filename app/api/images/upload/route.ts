import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tags = formData.get("tags") as string | null;
  const bucket = (formData.get("bucket") as string) || "slide-images";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const path = `${user.id}/${uuidv4()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

  if (bucket === "company-images") {
    await supabase.from("company_images").insert({
      uploaded_by: user.id,
      storage_path: path,
      filename: file.name,
      tags: tags ? tags.split(",").map((t) => t.trim().toLowerCase()) : [],
    });
  }

  return NextResponse.json({ url: publicUrl, path });
}
