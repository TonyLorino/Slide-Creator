"use client";

import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { useEditorStore } from "@/lib/store/editor-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, SlideData } from "@/lib/templates/types";
import {
  Send,
  Sparkles,
  PlusCircle,
  Pencil,
  ImageIcon,
  Loader2,
  Bot,
  User,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    label: "Generate Outline",
    icon: Sparkles,
    prompt: "Create a 10-slide presentation outline on the topic I'll describe next.",
  },
  {
    label: "Add Slide",
    icon: PlusCircle,
    prompt: "Add a new slide to the end of the deck. Ask me what content to put on it.",
  },
  {
    label: "Edit Slide",
    icon: Pencil,
    prompt: "I want to edit a specific slide. Which slide number should I update?",
  },
  {
    label: "Generate Images",
    icon: ImageIcon,
    prompt: "Generate images for any slides that have image placeholders. Pick appropriate visuals for the content on each slide.",
  },
];

async function generateImageForSlide(
  slideId: string,
  prompt: string,
  updateSlide: (id: string, updates: Partial<SlideData>) => void,
  addMessage: (msg: ChatMessage) => void
) {
  try {
    const res = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1536x1024" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Image generation failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.url) {
      updateSlide(slideId, { imageUrl: data.url });
      return true;
    }
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Image generation failed";
    addMessage({
      id: uuidv4(),
      role: "assistant",
      content: `Failed to generate image: ${msg}`,
      timestamp: Date.now(),
    });
    return false;
  }
}

export function ChatPanel() {
  const {
    messages,
    addMessage,
    slides,
    replaceAllSlides,
    updateSlide,
    isGenerating,
    setIsGenerating,
  } = useEditorStore();

  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      addMessage(userMessage);
      setInput("");
      setIsGenerating(true);

      try {
        const chatHistory = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.role === "assistant" && m.slideUpdates
            ? JSON.stringify({ message: m.content, action: m.slideUpdates.action, slides: [] })
            : m.content,
        }));

        const currentSlides = useEditorStore.getState().slides.map((s, i) => ({
          index: i,
          layoutKey: s.layoutKey,
          title: s.title,
          subtitle: s.subtitle,
          body: s.body,
        }));

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory, currentSlides }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: data.message || "Done.",
          timestamp: Date.now(),
          slideUpdates:
            data.slides && data.slides.length > 0
              ? { action: data.action, slides: data.slides }
              : null,
        };
        addMessage(assistantMessage);

        if (data.slides && data.slides.length > 0) {
          const newSlideIds = applySlideUpdates(data.action, data.slides);
          await generateImagesForNewSlides(data.action, data.slides, newSlideIds);
        }
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Something went wrong";
        addMessage({
          id: uuidv4(),
          role: "assistant",
          content: `I encountered an error: ${errMsg}. Please try again.`,
          timestamp: Date.now(),
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [messages, slides, isGenerating, addMessage, setIsGenerating, replaceAllSlides, updateSlide]
  );

  function applySlideUpdates(
    action: string,
    incomingSlides: Record<string, unknown>[]
  ): string[] {
    const newIds: string[] = [];

    const toSlideData = (
      s: Record<string, unknown>,
      idx: number
    ): SlideData => {
      const id = uuidv4();
      newIds.push(id);
      return {
        id,
        orderIndex: idx,
        layoutKey: (s.layoutKey as string) || "Slide Content",
        title: (s.title as string) || undefined,
        subtitle: (s.subtitle as string) || undefined,
        body: (s.body as string) || undefined,
        presenterInfo: (s.presenterInfo as string) || undefined,
        imageUrl: (s.imageUrl as string) || undefined,
        imagePrompt: (s.imagePrompt as string) || undefined,
        notes: (s.notes as string) || undefined,
      };
    };

    const currentSlides = useEditorStore.getState().slides;

    if (action === "replace_all") {
      replaceAllSlides(incomingSlides.map(toSlideData));
    } else if (action === "add_slides") {
      const startIdx = currentSlides.length;
      const newSlides = incomingSlides.map((s, i) =>
        toSlideData(s, startIdx + i)
      );
      replaceAllSlides([...currentSlides, ...newSlides]);
    } else if (action === "update_slides") {
      for (const incoming of incomingSlides) {
        const idx = incoming.index as number;
        if (idx >= 0 && idx < currentSlides.length) {
          const slideId = currentSlides[idx].id;
          newIds.push(slideId);
          updateSlide(slideId, {
            layoutKey:
              (incoming.layoutKey as string) || currentSlides[idx].layoutKey,
            title: incoming.title as string | undefined,
            subtitle: incoming.subtitle as string | undefined,
            body: incoming.body as string | undefined,
            presenterInfo: incoming.presenterInfo as string | undefined,
            notes: incoming.notes as string | undefined,
            imagePrompt: incoming.imagePrompt as string | undefined,
          });
        }
      }
    } else if (action === "delete_slides") {
      const indicesToDelete = new Set(
        incomingSlides.map((s) => s.index as number)
      );
      const remaining = currentSlides.filter(
        (_, i) => !indicesToDelete.has(i)
      );
      replaceAllSlides(remaining);
    }

    return newIds;
  }

  async function generateImagesForNewSlides(
    action: string,
    incomingSlides: Record<string, unknown>[],
    slideIds: string[]
  ) {
    if (action === "delete_slides") return;

    const slidesWithPrompts: { slideId: string; prompt: string }[] = [];

    for (let i = 0; i < incomingSlides.length; i++) {
      const incoming = incomingSlides[i];
      const prompt = incoming.imagePrompt as string | undefined;
      const existingUrl = incoming.imageUrl as string | undefined;

      if (prompt && !existingUrl && slideIds[i]) {
        slidesWithPrompts.push({ slideId: slideIds[i], prompt });
      }
    }

    if (slidesWithPrompts.length === 0) return;

    addMessage({
      id: uuidv4(),
      role: "assistant",
      content: `Generating ${slidesWithPrompts.length} image${slidesWithPrompts.length > 1 ? "s" : ""}...`,
      timestamp: Date.now(),
    });

    let successCount = 0;
    for (const { slideId, prompt } of slidesWithPrompts) {
      const ok = await generateImageForSlide(slideId, prompt, updateSlide, addMessage);
      if (ok) successCount++;
    }

    if (successCount > 0) {
      addMessage({
        id: uuidv4(),
        role: "assistant",
        content: `Generated ${successCount} image${successCount > 1 ? "s" : ""} successfully.`,
        timestamp: Date.now(),
      });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full w-[380px] flex-col border-r border-border/60 bg-background">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
          <Bot className="size-3.5 text-background" />
        </div>
        <h2 className="text-[13px] font-semibold tracking-tight">AI Assistant</h2>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                <Sparkles className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium tracking-tight">
                  Start building your deck
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Describe the presentation you want, or pick a quick action below.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-accent text-muted-foreground"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-3" />
                ) : (
                  <Bot className="size-3" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-accent text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.slideUpdates && msg.slideUpdates.slides.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] opacity-60">
                    <Sparkles className="size-2.5" />
                    {msg.slideUpdates.action === "replace_all"
                      ? `Generated ${msg.slideUpdates.slides.length} slides`
                      : msg.slideUpdates.action === "add_slides"
                        ? `Added ${msg.slideUpdates.slides.length} slides`
                        : msg.slideUpdates.action === "update_slides"
                          ? `Updated ${msg.slideUpdates.slides.length} slides`
                          : `Removed ${msg.slideUpdates.slides.length} slides`}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                <Bot className="size-3" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-accent px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-5 py-3">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-lg border-border/60 text-[12px] font-normal"
            onClick={() => sendMessage(action.prompt)}
            disabled={isGenerating}
          >
            <action.icon className="size-3" />
            {action.label}
          </Button>
        ))}
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-accent/40 p-2.5 transition-colors focus-within:border-border focus-within:bg-background">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your slides..."
            rows={1}
            disabled={isGenerating}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
          <Button
            size="icon-sm"
            className="size-7 shrink-0 rounded-lg"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
