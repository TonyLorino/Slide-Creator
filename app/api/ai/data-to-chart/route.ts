import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/azure-openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description, csvData } = await request.json();

  if (!description && !csvData) {
    return NextResponse.json(
      { error: "Either description or csvData is required" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are a data visualization expert. Given data (description or CSV), determine the best chart type and generate the chart configuration.

Supported chart types: bar, line, pie, doughnut, scatter, area

Respond with valid JSON:
{
  "chartType": "bar",
  "title": "Chart Title",
  "chartData": {
    "labels": ["Label 1", "Label 2", "Label 3"],
    "datasets": [
      {
        "label": "Series Name",
        "data": [10, 20, 30],
        "backgroundColor": ["#1F00FF", "#7700EC", "#FCCF00"]
      }
    ]
  }
}

Use these brand colors for datasets: #1F00FF, #7700EC, #FCCF00, #00D87D, #01454F, #8AAEFF, #00E5FA`;

  const userPrompt = csvData
    ? `Parse this CSV data and create a chart:\n\n${csvData.substring(0, 4000)}`
    : `Create a chart based on this description: "${description}"`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 2048 }
    );

    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const chartConfig = JSON.parse(cleaned);

    return NextResponse.json(chartConfig);
  } catch (error) {
    console.error("Data to chart error:", error);
    return NextResponse.json(
      { error: "Failed to generate chart" },
      { status: 500 }
    );
  }
}
