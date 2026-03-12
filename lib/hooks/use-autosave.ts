"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { toast } from "sonner";

const DEBOUNCE_MS = 2000;

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const deck = useEditorStore((s) => s.deck);
  const slides = useEditorStore((s) => s.slides);
  const isDirty = useEditorStore((s) => s.isDirty);
  const setIsSaving = useEditorStore((s) => s.setIsSaving);

  const save = useCallback(async () => {
    const state = useEditorStore.getState();
    if (!state.deck || !state.isDirty) return;

    const payload = JSON.stringify({
      slides: state.slides,
      title: state.deck.title,
    });

    if (payload === lastSavedRef.current) return;

    setIsSaving(true);

    try {
      const slidesPayload = state.slides.map((s) => ({
        id: s.id,
        order_index: s.orderIndex,
        layout_key: s.layoutKey,
        content: {
          title: s.title,
          subtitle: s.subtitle,
          body: s.body,
          presenterInfo: s.presenterInfo,
          imageUrl: s.imageUrl,
          imagePrompt: s.imagePrompt,
          tableData: s.tableData,
          chartData: s.chartData,
        },
        notes: s.notes,
      }));

      const res = await fetch(`/api/decks/${state.deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.deck.title,
          slides: slidesPayload,
          slideIds: state.slides.map((s) => s.id),
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      lastSavedRef.current = payload;
      useEditorStore.setState({ isDirty: false });
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [setIsSaving]);

  useEffect(() => {
    if (!isDirty || !deck) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(save, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isDirty, deck, slides, save]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useEditorStore.getState().isDirty) {
        e.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { save };
}
