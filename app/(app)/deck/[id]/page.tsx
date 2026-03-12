"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ChatPanel } from "@/components/editor/ChatPanel";
import { SlidePreviewGrid } from "@/components/editor/SlidePreviewGrid";
import { SlideDetailPanel } from "@/components/editor/SlideDetailPanel";
import { useAutoSave } from "@/lib/hooks/use-autosave";
import { Loader2 } from "lucide-react";
import type { SlideData, DeckData } from "@/lib/templates/types";

export default function DeckEditorPage() {
  const params = useParams();
  const deckId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setDeck = useEditorStore((s) => s.setDeck);
  const setSlides = useEditorStore((s) => s.setSlides);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const setMessages = useEditorStore((s) => s.setMessages);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const expandedSlideId = useEditorStore((s) => s.expandedSlideId);

  const { flushSave } = useAutoSave();

  const loadDeck = useCallback(async () => {
    resetEditor();
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      if (!res.ok) throw new Error("Failed to load deck");
      const data = await res.json();

      const deck: DeckData = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnail_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      const content = (raw: Record<string, unknown>) => {
        const c = raw.content as Record<string, unknown> | null;
        return c ?? {};
      };

      const slides: SlideData[] = (data.slides || []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as string,
          orderIndex: s.order_index as number,
          layoutKey: s.layout_key as string,
          title: (content(s).title as string) || undefined,
          subtitle: (content(s).subtitle as string) || undefined,
          body: (content(s).body as string) || undefined,
          presenterInfo: (content(s).presenterInfo as string) || undefined,
          imageUrl: (content(s).imageUrl as string) || undefined,
          imagePrompt: (content(s).imagePrompt as string) || undefined,
          notes: (s.notes as string) || undefined,
          tableData: content(s).tableData as string[][] | undefined,
          chartData: content(s).chartData as SlideData["chartData"],
        })
      );

      setDeck(deck);
      setSlides(slides);
      if (slides.length > 0) {
        setActiveSlide(slides[0].id);
      }

      const savedMessages = Array.isArray(data.chat_messages)
        ? data.chat_messages
        : [];
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      }
    } catch {
      setError("Failed to load deck");
    } finally {
      setLoading(false);
    }
  }, [deckId, setDeck, setSlides, setActiveSlide, setMessages, resetEditor]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if (
        (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === "y" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <EditorHeader onFlushSave={flushSave} />
      <div className="flex flex-1 overflow-hidden">
        <ChatPanel />
        <SlidePreviewGrid />
      </div>
      {expandedSlideId && <SlideDetailPanel />}
    </div>
  );
}
