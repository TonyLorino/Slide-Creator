"use client";

import * as React from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { SlidePreviewCard } from "./SlidePreviewCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Presentation } from "lucide-react";

export function SlidePreviewGrid() {
  const {
    slides,
    activeSlideId,
    setActiveSlide,
    setExpandedSlide,
    removeSlide,
    duplicateSlide,
  } = useEditorStore();

  if (slides.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <Presentation className="size-16 opacity-20" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No slides yet</p>
          <p className="mt-1 text-xs">
            Use the chat to describe the presentation you want to create.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 overflow-auto">
      <div className="flex flex-wrap content-start gap-6 p-6">
        {slides
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((slide, i) => (
            <SlidePreviewCard
              key={slide.id}
              slide={slide}
              index={i}
              isActive={slide.id === activeSlideId}
              onClick={() => {
                setActiveSlide(slide.id);
                setExpandedSlide(slide.id);
              }}
              onDelete={() => removeSlide(slide.id)}
              onDuplicate={() => duplicateSlide(slide.id)}
            />
          ))}
      </div>
    </ScrollArea>
  );
}
