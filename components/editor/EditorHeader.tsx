"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Check,
  Loader2,
  Circle,
  Download,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";

export function EditorHeader() {
  const router = useRouter();
  const deck = useEditorStore((s) => s.deck);
  const slides = useEditorStore((s) => s.slides);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const updateDeckTitle = useEditorStore((s) => s.updateDeckTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);

  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function startEditing() {
    setTitleDraft(deck?.title ?? "Untitled Deck");
    setIsEditing(true);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== deck?.title) {
      updateDeckTitle(trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  }

  async function handleGeneratePptx() {
    if (slides.length === 0) {
      toast.error("Add some slides before generating");
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        title: deck?.title ?? "Untitled",
        slides: slides.map((s) => ({
          layoutKey: s.layoutKey,
          title: s.title,
          subtitle: s.subtitle,
          body: s.body,
          presenterInfo: s.presenterInfo,
          imageUrl: s.imageUrl,
          notes: s.notes,
          tableData: s.tableData,
          chartData: s.chartData,
        })),
      };

      const res = await fetch("/api/generate-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("PPTX generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck?.title ?? "presentation"}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PPTX downloaded!");
    } catch {
      toast.error("Failed to generate PPTX");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <TooltipProvider>
      <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              className="inline-flex size-8 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to Dashboard</TooltipContent>
          </Tooltip>

          {isEditing ? (
            <Input
              ref={inputRef}
              className="h-7 max-w-[300px] px-2 text-sm font-semibold"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <button
              onClick={startEditing}
              className="max-w-[300px] truncate rounded px-2 py-1 text-left text-sm font-semibold transition-colors hover:bg-muted"
            >
              {deck?.title ?? "Untitled Deck"}
            </button>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Saving…</span>
            </>
          ) : isDirty ? (
            <>
              <Circle className="size-2 fill-amber-400 text-amber-400" />
              <span>Unsaved changes</span>
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-600">Saved</span>
            </>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <Undo2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              <Redo2 className="size-3.5" />
            </Button>
          </div>

          <span className="text-xs text-muted-foreground">
            {slides.length} slide{slides.length !== 1 ? "s" : ""}
          </span>

          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleGeneratePptx}
            disabled={generating || slides.length === 0}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Generate PPTX
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
