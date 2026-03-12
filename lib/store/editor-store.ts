import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { SlideData, DeckData, ChatMessage } from "@/lib/templates/types";

interface HistoryEntry {
  slides: SlideData[];
  activeSlideId: string | null;
}

interface EditorState {
  deck: DeckData | null;
  slides: SlideData[];
  activeSlideId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  expandedSlideId: string | null;

  messages: ChatMessage[];

  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  setDeck: (deck: DeckData) => void;
  setSlides: (slides: SlideData[]) => void;
  setActiveSlide: (slideId: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setExpandedSlide: (slideId: string | null) => void;

  addSlide: (layoutKey: string, afterIndex?: number) => SlideData;
  removeSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  reorderSlide: (slideId: string, newIndex: number) => void;
  updateSlide: (slideId: string, updates: Partial<SlideData>) => void;
  replaceAllSlides: (slides: SlideData[]) => void;

  updateDeckTitle: (title: string) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;

  resetEditor: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  getActiveSlide: () => SlideData | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  deck: null,
  slides: [],
  activeSlideId: null,
  isDirty: false,
  isSaving: false,
  isGenerating: false,
  expandedSlideId: null,

  messages: [],

  undoStack: [],
  redoStack: [],

  setDeck: (deck) => set({ deck }),
  setSlides: (slides) => set({ slides, isDirty: false }),
  setActiveSlide: (slideId) => set({ activeSlideId: slideId }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setExpandedSlide: (slideId) => set({ expandedSlideId: slideId }),

  addSlide: (layoutKey, afterIndex) => {
    const state = get();
    state.pushHistory();
    const newSlide: SlideData = {
      id: uuidv4(),
      orderIndex: afterIndex !== undefined ? afterIndex + 1 : state.slides.length,
      layoutKey,
    };
    const slides = [...state.slides];
    const insertIdx =
      afterIndex !== undefined ? afterIndex + 1 : slides.length;
    slides.splice(insertIdx, 0, newSlide);
    const reindexed = slides.map((s, i) => ({ ...s, orderIndex: i }));
    set({ slides: reindexed, activeSlideId: newSlide.id, isDirty: true });
    return newSlide;
  },

  removeSlide: (slideId) => {
    const state = get();
    if (state.slides.length <= 1) return;
    state.pushHistory();
    const idx = state.slides.findIndex((s) => s.id === slideId);
    const slides = state.slides
      .filter((s) => s.id !== slideId)
      .map((s, i) => ({ ...s, orderIndex: i }));
    const newActiveId =
      state.activeSlideId === slideId
        ? slides[Math.min(idx, slides.length - 1)]?.id ?? null
        : state.activeSlideId;
    set({ slides, activeSlideId: newActiveId, isDirty: true });
  },

  duplicateSlide: (slideId) => {
    const state = get();
    state.pushHistory();
    const source = state.slides.find((s) => s.id === slideId);
    if (!source) return;
    const idx = state.slides.indexOf(source);
    const newSlide: SlideData = {
      ...structuredClone(source),
      id: uuidv4(),
      orderIndex: idx + 1,
    };
    const slides = [...state.slides];
    slides.splice(idx + 1, 0, newSlide);
    const reindexed = slides.map((s, i) => ({ ...s, orderIndex: i }));
    set({ slides: reindexed, activeSlideId: newSlide.id, isDirty: true });
  },

  reorderSlide: (slideId, newIndex) => {
    const state = get();
    state.pushHistory();
    const slides = [...state.slides];
    const currentIdx = slides.findIndex((s) => s.id === slideId);
    if (currentIdx === -1 || currentIdx === newIndex) return;
    const [moved] = slides.splice(currentIdx, 1);
    slides.splice(newIndex, 0, moved);
    const reindexed = slides.map((s, i) => ({ ...s, orderIndex: i }));
    set({ slides: reindexed, isDirty: true });
  },

  updateSlide: (slideId, updates) => {
    set((state) => ({
      slides: state.slides.map((s) =>
        s.id === slideId ? { ...s, ...updates } : s
      ),
      isDirty: true,
    }));
  },

  replaceAllSlides: (slides) => {
    const state = get();
    state.pushHistory();
    const reindexed = slides.map((s, i) => ({
      ...s,
      id: s.id || uuidv4(),
      orderIndex: i,
    }));
    set({
      slides: reindexed,
      activeSlideId: reindexed[0]?.id ?? null,
      isDirty: true,
    });
  },

  updateDeckTitle: (title) => {
    set((state) => ({
      deck: state.deck ? { ...state.deck, title } : null,
      isDirty: true,
    }));
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setMessages: (messages) => set({ messages }),

  resetEditor: () =>
    set({
      deck: null,
      slides: [],
      activeSlideId: null,
      isDirty: false,
      isSaving: false,
      isGenerating: false,
      expandedSlideId: null,
      messages: [],
      undoStack: [],
      redoStack: [],
    }),

  pushHistory: () => {
    const { slides, activeSlideId, undoStack } = get();
    const entry: HistoryEntry = {
      slides: structuredClone(slides),
      activeSlideId,
    };
    const newStack = [...undoStack, entry].slice(-50);
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, slides, activeSlideId, redoStack } = get();
    if (undoStack.length === 0) return;
    const current: HistoryEntry = {
      slides: structuredClone(slides),
      activeSlideId,
    };
    const prev = undoStack[undoStack.length - 1];
    set({
      slides: prev.slides,
      activeSlideId: prev.activeSlideId,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
      isDirty: true,
    });
  },

  redo: () => {
    const { redoStack, slides, activeSlideId, undoStack } = get();
    if (redoStack.length === 0) return;
    const current: HistoryEntry = {
      slides: structuredClone(slides),
      activeSlideId,
    };
    const next = redoStack[redoStack.length - 1];
    set({
      slides: next.slides,
      activeSlideId: next.activeSlideId,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current],
      isDirty: true,
    });
  },

  getActiveSlide: () => {
    const { slides, activeSlideId } = get();
    return slides.find((s) => s.id === activeSlideId) ?? null;
  },
}));
