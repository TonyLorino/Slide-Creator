"use client";

import { useEditorStore } from "@/lib/store/editor-store";
import {
  LAYOUTS_BY_CATEGORY,
  CATEGORY_LABELS,
} from "@/lib/templates/layouts";
import type { LayoutCategory, LayoutDef } from "@/lib/templates/types";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border/40 bg-background shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-base font-medium">
              {mode === "add" ? "Add New Slide" : "Change Layout"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mode === "add"
                ? "Choose a layout for your new slide"
                : "Select a new layout for this slide"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
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
                          className="group text-left rounded-xl border border-border/60 hover:border-foreground/20 hover:shadow-md transition-all duration-150 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </div>
      </div>
    </div>
  );
}
