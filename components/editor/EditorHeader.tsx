"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
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

interface EditorHeaderProps {
  onFlushSave: () => Promise<void>;
}

export function EditorHeader({ onFlushSave }: EditorHeaderProps) {
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

  async function handleBack() {
    await onFlushSave();
    router.push("/");
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
    <header className="flex h-14 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-md px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            className="inline-flex size-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Dashboard</TooltipContent>
        </Tooltip>

        {isEditing ? (
          <Input
            ref={inputRef}
            className="h-8 max-w-[320px] border-none bg-accent/50 px-3 text-sm font-medium shadow-none focus-visible:ring-1"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button
            onClick={startEditing}
            className="max-w-[320px] truncate rounded-lg px-3 py-1.5 text-left text-sm font-medium tracking-tight transition-colors hover:bg-accent"
          >
            {deck?.title ?? "Untitled Deck"}
          </button>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 text-xs text-muted-foreground">
        {isSaving ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            <span>Saving</span>
          </>
        ) : isDirty ? (
          <>
            <Circle className="size-1.5 fill-amber-400 text-amber-400" />
            <span>Unsaved</span>
          </>
        ) : (
          <>
            <Check className="size-3 text-emerald-500" />
            <span className="text-emerald-600">Saved</span>
          </>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-accent/30 p-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={undoStack.length === 0}
            className="size-7 rounded-md"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={redoStack.length === 0}
            className="size-7 rounded-md"
          >
            <Redo2 className="size-3.5" />
          </Button>
        </div>

        <span className="mx-1 text-xs tabular-nums text-muted-foreground">
          {slides.length} slide{slides.length !== 1 ? "s" : ""}
        </span>

        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-3.5 text-xs font-medium"
          onClick={handleGeneratePptx}
          disabled={generating || slides.length === 0}
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Export PPTX
        </Button>
      </div>
    </header>
  );
}
