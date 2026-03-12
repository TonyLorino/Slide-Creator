import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const pptxBytes = await generatePptx(body);
    const uint8 = new Uint8Array(pptxBytes);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${(body.title || "presentation").replace(/[^a-zA-Z0-9 ]/g, "")}.pptx"`,
      },
    });
  } catch (error) {
    console.error("PPTX generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PPTX" },
      { status: 500 }
    );
  }
}

async function generatePptx(deckData: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "generate_pptx.py");
    const proc = spawn("python3", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout: Buffer[] = [];
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout.push(data);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      } else {
        resolve(Buffer.concat(stdout));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.stdin.write(JSON.stringify(deckData));
    proc.stdin.end();
  });
}
