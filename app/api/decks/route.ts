import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("decks")
    .select("*, slides(id, order_index, layout_key, thumbnail_url)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = body.title || "Untitled Deck";

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .insert({ user_id: user.id, title })
    .select()
    .single();

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 });
  }

  const { error: slideError } = await supabase.from("slides").insert({
    deck_id: deck.id,
    order_index: 0,
    layout_key: "Title 2",
    content: { elements: [] },
  });

  if (slideError) {
    return NextResponse.json({ error: slideError.message }, { status: 500 });
  }

  return NextResponse.json(deck, { status: 201 });
}
