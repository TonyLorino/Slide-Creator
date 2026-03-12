import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (deckError || !deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("*")
    .eq("deck_id", id)
    .order("order_index", { ascending: true });

  if (slidesError) {
    return NextResponse.json({ error: slidesError.message }, { status: 500 });
  }

  return NextResponse.json({ ...deck, slides });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.slides) {
    for (const slide of body.slides) {
      const { id: slideId, ...slideData } = slide;
      if (slideId && !slideId.startsWith("temp-")) {
        await supabase
          .from("slides")
          .update({
            order_index: slideData.orderIndex ?? slideData.order_index,
            layout_key: slideData.layoutKey ?? slideData.layout_key,
            content: slideData.content,
            notes: slideData.notes,
          })
          .eq("id", slideId)
          .eq("deck_id", id);
      } else {
        await supabase.from("slides").insert({
          id: slideId && !slideId.startsWith("temp-") ? slideId : undefined,
          deck_id: id,
          order_index: slideData.orderIndex ?? slideData.order_index ?? 0,
          layout_key: slideData.layoutKey ?? slideData.layout_key ?? "Slide Content",
          content: slideData.content ?? { elements: [] },
          notes: slideData.notes,
        });
      }
    }
  }

  const deckUpdates: Record<string, unknown> = {};
  if (body.title !== undefined) deckUpdates.title = body.title;
  if (body.description !== undefined) deckUpdates.description = body.description;
  if (body.thumbnail_url !== undefined) deckUpdates.thumbnail_url = body.thumbnail_url;

  if (Object.keys(deckUpdates).length > 0) {
    const { error } = await supabase
      .from("decks")
      .update(deckUpdates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Remove slides that were deleted client-side
  if (body.slideIds) {
    const currentSlideIds: string[] = body.slideIds;
    const { data: existingSlides } = await supabase
      .from("slides")
      .select("id")
      .eq("deck_id", id);

    if (existingSlides) {
      const toDelete = existingSlides
        .filter((s) => !currentSlideIds.includes(s.id))
        .map((s) => s.id);

      if (toDelete.length > 0) {
        await supabase.from("slides").delete().in("id", toDelete);
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
