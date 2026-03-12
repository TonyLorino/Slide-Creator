"use client";

import { useEditorStore } from "@/lib/store/editor-store";
import {
  LAYOUTS_BY_CATEGORY,
  CATEGORY_LABELS,
} from "@/lib/templates/layouts";
import type { LayoutCategory, LayoutDef } from "@/lib/templates/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const DARK_BACKGROUNDS = new Set(["#000000", "#1F00FF", "#01454F"]);

function isLayoutDark(layout: LayoutDef): boolean {
  return (
    DARK_BACKGROUNDS.has(layout.background) ||
    layout.name.includes("Dark") ||
    layout.name.includes("Black")
  );
}

const CATEGORY_ORDER: LayoutCategory[] = [
  "title",
  "contents",
  "divider",
  "statement",
  "content",
  "twoColumn",
  "asymmetric",
  "boldTitle",
  "copyImage",
  "titleOnly",
  "blank",
  "close",
];

interface LayoutPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "change";
  targetSlideId?: string | null;
}

export function LayoutPicker({
  open,
  onOpenChange,
  mode,
  targetSlideId,
}: LayoutPickerProps) {
  const addSlide = useEditorStore((s) => s.addSlide);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const slides = useEditorStore((s) => s.slides);
  const activeSlideId = useEditorStore((s) => s.activeSlideId);

  function handleSelect(layoutName: string) {
    if (mode === "add") {
      const activeIdx = slides.findIndex((s) => s.id === activeSlideId);
      addSlide(layoutName, activeIdx >= 0 ? activeIdx : undefined);
    } else if (mode === "change" && targetSlideId) {
      updateSlide(targetSlideId, { layoutKey: layoutName });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {mode === "add" ? "Add New Slide" : "Change Layout"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "add"
              ? "Choose a layout for your new slide"
              : "Select a new layout for this slide"}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const layouts = LAYOUTS_BY_CATEGORY[category];
              if (!layouts || layouts.length === 0) return null;

              return (
                <section key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {CATEGORY_LABELS[category]}
                    <span className="ml-1.5 text-muted-foreground/50 font-normal">
                      ({layouts.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {layouts.map((layout) => {
                      const dark = isLayoutDark(layout);
                      return (
                        <button
                          key={layout.index}
                          onClick={() => handleSelect(layout.name)}
                          className="group text-left rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div
                            className="w-full relative"
                            style={{
                              aspectRatio: "16 / 9",
                              backgroundColor: layout.background,
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={`text-[9px] font-medium px-2 text-center leading-tight ${
                                  dark ? "text-white/40" : "text-black/20"
                                }`}
                              >
                                {layout.placeholders
                                  .filter((p) => p.type !== "slideNumber")
                                  .map((p) => p.type)
                                  .join(" · ")}
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </div>
                          <div className="px-2 py-1.5 bg-background">
                            <p className="text-[11px] font-medium truncate leading-tight">
                              {layout.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
