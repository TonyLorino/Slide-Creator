import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/azure-openai";

const LAYOUT_REFERENCE = `Available slide layouts (use exact names):

TITLE SLIDES:
- "Title 1" – title, subtitle, presenter info, 4 picture placeholders. Best for cover slides with imagery.
- "Title 2" – title, subtitle, presenter info. Clean text-only cover.
- "Dark Title 2" – same as Title 2 on black background.
- "Title 3" – large picture left, title + subtitle right.
- "Title 4" – large picture left, title + subtitle right (variant).

CONTENTS / TABLE OF CONTENTS:
- "Contents Page White" – single body placeholder for agenda items.
- "Contents Page Extended White" – two body placeholders for longer agendas.
- "Dark Contents Page" – single body on black.
- "Dark Contents Page Extended" – two body columns on black.

DIVIDERS (section breaks):
- "Divider Black" – title + subtitle on black.
- "Divider White" – title + subtitle on white.
- "Divider Light Colour" – title + subtitle on brand light colour.
- "Divider Colour" – title + subtitle on brand colour.

STATEMENTS (large text emphasis):
- "Statement 1" – title + subtitle on sage green (#9AB5B9).
- "Dark Statement 1" – title + subtitle on black.

CONTENT (general body slides):
- "Slide Content" – title + body. The workhorse content layout.
- "Slide Content Dark" – same on black.

TWO COLUMN:
- "2 Column Content" – title + 2 body columns.
- "2 Column Content- With 2 headings" – 2 headings + 2 body columns.
- "2 Column Content(For less content)" – title + 2 body, more whitespace.
- "2 Column Content(For less content) With 2 headings" – variant with 2 headings.
- "Two Column Pattern" – title + 2 body columns with pattern decoration.
- "Two Column Pattern - With 2 headings" – variant with 2 headings.
- "Two Column Pattern(For less content)" – less content variant.
- "Two Column Pattern(For less content) With 2 headings" – variant.

ASYMMETRIC (narrow left + wide right):
- "Narrow Left Copy & Wide Copy/Table Right" – title + narrow left + wide right.
- "Narrow Left Copy & Wide Copy/Table Right 1" – variant 1.
- "Narrow Left Copy & Wide Copy/Table Right 2" – variant with extra body.

BOLD TITLE:
- "Title Content Bold (NEW)" – bold title + body, strong visual.
- "Dark Title Content Bold (NEW)" – dark variant.
- "Title Content Bold (For less Content)" – more whitespace.
- "Title Content Bold (NEW) Pattern" – pattern decoration variant.
- "Two Line Title Content Bold (For less Content)" – two-line title variant.

COPY + IMAGE:
- "Copy + Image" – picture + title/body side by side, image right.
- "Copy + Image (For less Content)" – same with more whitespace.
- "Left Image + Copy" – image left, text right.
- "Left Image + Copy (For less Content)" – variant.
- "Copy + Image Frame" – framed image variant.
- "Copy + Image Frame (For less Content)" – framed, less content.
- "Copy + 2 Image Frame" – 2 framed images + body.
- "Copy + 2 Image Frame (For less Content)" – less content variant.
- "Copy + Multiple Image Frames" – 3 framed images + body.
- "Dark Copy + Multiple Image Frames" – dark variant.
- "Copy + 2  Image Frames" – 2 images + body.
- "Copy + 2  Image Frames (For less content)" – variant.
- "Dark Copy + 2  Image Frames" – dark variant.
- "Dark Copy + 2  Image Frames (For less Content)" – dark, less content.

TITLE ONLY:
- "Title Only (NEW)" – title bar + body area.
- "Black Title Only" – dark variant.
- "Title With Pattern (NEW)" – title + pattern decoration.

BLANK:
- "Blank" – empty white slide.
- "Colour Blank" – empty coloured slide.

CLOSING:
- "Close 1" – closing slide with title + contact info.
- "Close 2" – simple closing with title only.
- "Dark Close 1" – dark variant.
- "Dark Close 2" – dark, title only.`;

const SYSTEM_PROMPT = `You are a professional presentation designer for Digital Realty, a leading global data center company. You help users create polished, professional PowerPoint presentations using the company template.

${LAYOUT_REFERENCE}

BRAND GUIDELINES:
- Primary colors: Black (#000000), White (#FFFFFF), Blue (#1F00FF)
- Accent colors: Purple (#7700EC), Yellow (#FCCF00), Green (#00D87D), Dark Teal (#01454F)
- Font: Arial
- Professional, clean, corporate tone
- Data center / technology industry context

YOUR TASK:
When the user asks you to create or modify slides, respond with:
1. A friendly, helpful message explaining what you did
2. Structured slide data in JSON format

RESPONSE FORMAT:
Always respond with valid JSON in this exact structure:
{
  "message": "Your friendly explanation of what you created/changed",
  "action": "replace_all" | "update_slides" | "add_slides" | "delete_slides",
  "slides": [
    {
      "index": 0,
      "layoutKey": "exact layout name from the list above",
      "title": "Slide title text",
      "subtitle": "Subtitle text (optional)",
      "body": "Body content text. Use \\n for line breaks. Use bullet points where appropriate.",
      "presenterInfo": "Presenter name, date, etc. (only for title slides)",
      "imagePrompt": "Description of an image to generate (optional)",
      "notes": "Speaker notes for this slide (optional)"
    }
  ]
}

RULES:
- For "replace_all": return the complete set of slides (replaces everything)
- For "update_slides": return only the slides that changed, with their index
- For "add_slides": return new slides to append
- For "delete_slides": return slides with just the index field to indicate which to remove
- Use "Slide Content" as the default content layout
- Use "Title 2" as the default title/cover slide
- Use "Divider Black" or "Divider White" for section breaks
- Use "Close 1" for ending slides
- Keep slide content concise and professional
- If the user's request is conversational (not about slides), still return valid JSON with just a message and no slides:
  {"message": "your response", "action": "replace_all", "slides": []}
- Never include markdown code fences in your JSON response
- For body text, use plain text with \\n line breaks for each point. Do NOT prefix lines with bullet characters like •, -, or * -- the template adds bullet formatting automatically`;

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  currentSlides?: {
    index: number;
    layoutKey: string;
    title?: string;
    subtitle?: string;
    body?: string;
  }[];
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { messages, currentSlides } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    let contextMessage = "";
    if (currentSlides && currentSlides.length > 0) {
      contextMessage = "\n\nCurrent deck state:\n";
      for (const slide of currentSlides) {
        contextMessage += `Slide ${slide.index + 1}: [${slide.layoutKey}] "${slide.title || "(no title)"}"\n`;
        if (slide.body) {
          contextMessage += `  Body: ${slide.body.slice(0, 100)}${slide.body.length > 100 ? "..." : ""}\n`;
        }
      }
    }

    const aiMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT + contextMessage },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.role === "assistant" ? extractMessageFromJson(m.content) : m.content,
      })),
    ];

    const raw = await chatCompletion(aiMessages, {
      temperature: 0.7,
      maxTokens: 8192,
      responseFormat: { type: "json_object" },
    });

    const parsed = parseAIResponse(raw);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI chat error:", message);
    return NextResponse.json(
      {
        message: `Sorry, I encountered an issue: ${message.slice(0, 200)}`,
        action: "replace_all",
        slides: [],
      },
      { status: 200 }
    );
  }
}

function extractMessageFromJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return parsed.message || content;
  } catch {
    return content;
  }
}

function parseAIResponse(raw: string): {
  message: string;
  action: string;
  slides: Record<string, unknown>[];
} {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      message: parsed.message || "Here are your slides.",
      action: parsed.action || "replace_all",
      slides: Array.isArray(parsed.slides) ? parsed.slides : [],
    };
  } catch {
    return {
      message: cleaned || "I had trouble generating the slides. Could you try rephrasing?",
      action: "replace_all",
      slides: [],
    };
  }
}
