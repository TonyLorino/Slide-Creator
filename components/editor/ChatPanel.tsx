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
    label: "Add Images",
    icon: ImageIcon,
    prompt: "Suggest image descriptions for the slides that could benefit from visuals.",
  },
];

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

        const currentSlides = slides.map((s, i) => ({
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
          applySlideUpdates(data.action, data.slides);
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
  ) {
    const toSlideData = (
      s: Record<string, unknown>,
      idx: number
    ): SlideData => ({
      id: uuidv4(),
      orderIndex: idx,
      layoutKey: (s.layoutKey as string) || "Slide Content",
      title: (s.title as string) || undefined,
      subtitle: (s.subtitle as string) || undefined,
      body: (s.body as string) || undefined,
      presenterInfo: (s.presenterInfo as string) || undefined,
      imageUrl: (s.imageUrl as string) || undefined,
      imagePrompt: (s.imagePrompt as string) || undefined,
      notes: (s.notes as string) || undefined,
    });

    if (action === "replace_all") {
      replaceAllSlides(incomingSlides.map(toSlideData));
    } else if (action === "add_slides") {
      const startIdx = slides.length;
      const newSlides = incomingSlides.map((s, i) =>
        toSlideData(s, startIdx + i)
      );
      replaceAllSlides([...slides, ...newSlides]);
    } else if (action === "update_slides") {
      const updated = [...slides];
      for (const incoming of incomingSlides) {
        const idx = incoming.index as number;
        if (idx >= 0 && idx < updated.length) {
          updateSlide(updated[idx].id, {
            layoutKey:
              (incoming.layoutKey as string) || updated[idx].layoutKey,
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
      const remaining = slides.filter(
        (_, i) => !indicesToDelete.has(i)
      );
      replaceAllSlides(remaining);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full w-[400px] flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Bot className="size-5 text-primary" />
        <h2 className="text-sm font-semibold">AI Slide Assistant</h2>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-12 text-center text-muted-foreground">
              <Sparkles className="size-10 text-primary/40" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Start building your deck
                </p>
                <p className="mt-1 text-xs">
                  Describe the presentation you want to create, or use a quick
                  action below.
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
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.slideUpdates && msg.slideUpdates.slides.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
                    <Sparkles className="size-3" />
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
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(action.prompt)}
              disabled={isGenerating}
            >
              <action.icon className="size-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your slides..."
            rows={1}
            disabled={isGenerating}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="icon-sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
