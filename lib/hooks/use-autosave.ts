"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { toast } from "sonner";

const DEBOUNCE_MS = 2000;

async function persistDeck(): Promise<boolean> {
  const state = useEditorStore.getState();
  if (!state.deck || !state.isDirty) return true;

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

  const chatPayload = state.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    slideUpdates: m.slideUpdates
      ? { action: m.slideUpdates.action, slides: [] }
      : null,
  }));

  const res = await fetch(`/api/decks/${state.deck.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: state.deck.title,
      slides: slidesPayload,
      slideIds: state.slides.map((s) => s.id),
      chat_messages: chatPayload,
    }),
  });

  if (!res.ok) return false;

  useEditorStore.setState({ isDirty: false });
  return true;
}

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const deck = useEditorStore((s) => s.deck);
  const slides = useEditorStore((s) => s.slides);
  const messages = useEditorStore((s) => s.messages);
  const isDirty = useEditorStore((s) => s.isDirty);
  const setIsSaving = useEditorStore((s) => s.setIsSaving);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
      const ok = await persistDeck();
      if (!ok) toast.error("Failed to save changes");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [setIsSaving]);

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await save();
  }, [save]);

  useEffect(() => {
    if (!isDirty || !deck) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, deck, slides, messages, save]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useEditorStore.getState().isDirty) {
        e.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (useEditorStore.getState().isDirty) {
        persistDeck();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { save, flushSave };
}
