"use client";

import * as React from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { LAYOUT_MAP } from "@/lib/templates/layouts";
import { BRAND_COLORS } from "@/lib/templates/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutPicker } from "./LayoutPicker";
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  StickyNote,
  ImageIcon,
} from "lucide-react";

const BULLET_RE = /^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s*/;

function stripBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(BULLET_RE, ""))
    .filter((line) => line.trim() !== "");
}

function BodyBullets({
  text,
  fontSize,
  color,
}: {
  text: string;
  fontSize: number;
  color: string;
}) {
  const lines = stripBullets(text);
  const dotSize = Math.max(fontSize * 0.35, 3);
  return (
    <div className="flex flex-col" style={{ gap: fontSize * 0.2 }}>
      {lines.map((line, i) => (
        <div key={i} className="flex items-start" style={{ gap: fontSize * 0.5 }}>
          <span
            className="mt-[0.45em] shrink-0 rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

export function SlideDetailPanel() {
  const { slides, expandedSlideId, setExpandedSlide, updateSlide } =
    useEditorStore();

  const [layoutPickerOpen, setLayoutPickerOpen] = React.useState(false);

  const slide = slides.find((s) => s.id === expandedSlideId);
  if (!slide) return null;

  const slideIndex = slides.findIndex((s) => s.id === expandedSlideId);
  const layout = LAYOUT_MAP[slide.layoutKey] ?? null;
  const bg = layout?.background ?? BRAND_COLORS.white;
  const isDark =
    bg === "#000000" || bg === "#01454F" || bg === "#1F00FF" || bg === "#7700EC";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  const hasTitlePh = layout?.placeholders.some((p) => p.type === "title");
  const hasSubtitlePh = layout?.placeholders.some((p) => p.type === "subtitle");
  const hasBodyPh = layout?.placeholders.some((p) => p.type === "body");
  const hasPicturePh = layout?.placeholders.some((p) => p.type === "picture");

  function goToSlide(delta: number) {
    const newIdx = slideIndex + delta;
    if (newIdx >= 0 && newIdx < slides.length) {
      setExpandedSlide(slides[newIdx].id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/40 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => goToSlide(-1)}
              disabled={slideIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-[13px] font-medium tabular-nums">
              Slide {slideIndex + 1} of {slides.length}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => goToSlide(1)}
              disabled={slideIndex === slides.length - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg border-border/60 text-[12px] font-normal"
              onClick={() => setLayoutPickerOpen(true)}
            >
              <LayoutGrid className="size-3" />
              Change Layout
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => setExpandedSlide(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 items-center justify-center bg-accent/30 p-8">
            <div
              className="relative overflow-hidden rounded-xl shadow-lg"
              style={{
                width: 640,
                height: 360,
                backgroundColor: bg,
              }}
            >
              {layout?.placeholders.map((ph) => {
                const scaleX = 640 / 13.333;
                const scaleY = 360 / 7.5;
                const x = ph.x * scaleX;
                const y = ph.y * scaleY;
                const w = ph.width * scaleX;
                const h = ph.height * scaleY;

                if (ph.type === "slideNumber") {
                  return (
                    <div
                      key={`ph-${ph.idx}`}
                      className="absolute text-right"
                      style={{
                        left: x,
                        top: y,
                        width: w,
                        height: h,
                        fontSize: 10,
                        color: textColor,
                        opacity: 0.4,
                      }}
                    >
                      {slideIndex + 1}
                    </div>
                  );
                }

                if (ph.type === "picture") {
                  if (!slide.imageUrl) return null;
                  return (
                    <div
                      key={`ph-${ph.idx}`}
                      className="absolute overflow-hidden rounded"
                      style={{ left: x, top: y, width: w, height: h }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  );
                }

                let content: string | undefined;
                let fontSize: number;
                let fontWeight = "normal";
                let isBody = false;

                if (ph.type === "title") {
                  content = slide.title;
                  fontSize = Math.min(ph.fontSize ?? 24, 30) * (640 / 960);
                  fontWeight = "bold";
                } else if (ph.type === "subtitle") {
                  content = slide.subtitle;
                  fontSize = Math.min(ph.fontSize ?? 16, 20) * (640 / 960);
                } else {
                  const nm = ph.name.toLowerCase();
                  if (nm.includes("presenter") || nm.includes("info")) {
                    content = slide.presenterInfo;
                  } else {
                    content = slide.body;
                    isBody = true;
                  }
                  fontSize = Math.min(ph.fontSize ?? 12, 16) * (640 / 960);
                }

                if (!content) return null;

                return (
                  <div
                    key={`ph-${ph.idx}`}
                    className="absolute overflow-hidden"
                    style={{
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      fontSize,
                      fontWeight,
                      lineHeight: 1.35,
                      color: textColor,
                    }}
                  >
                    {isBody ? (
                      <BodyBullets text={content} fontSize={fontSize} color={textColor} />
                    ) : (
                      <p className="whitespace-pre-wrap">{content}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-[340px] border-l border-border/60">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-5 p-5">
                <div className="rounded-xl bg-accent/60 px-3.5 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Layout
                  </p>
                  <p className="text-[13px] font-medium tracking-tight mt-0.5">{slide.layoutKey}</p>
                </div>

                {(hasTitlePh ?? true) && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Title</Label>
                    <Input
                      className="h-9 rounded-lg border-border/60 text-[13px]"
                      value={slide.title ?? ""}
                      onChange={(e) =>
                        updateSlide(slide.id, {
                          title: (e.target as HTMLInputElement).value,
                        })
                      }
                      placeholder="Slide title"
                    />
                  </div>
                )}

                {(hasSubtitlePh ?? false) && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Subtitle</Label>
                    <Input
                      className="h-9 rounded-lg border-border/60 text-[13px]"
                      value={slide.subtitle ?? ""}
                      onChange={(e) =>
                        updateSlide(slide.id, {
                          subtitle: (e.target as HTMLInputElement).value,
                        })
                      }
                      placeholder="Subtitle"
                    />
                  </div>
                )}

                {(hasBodyPh ?? true) && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Body</Label>
                    <Textarea
                      className="rounded-lg border-border/60 text-[13px]"
                      value={slide.body ?? ""}
                      onChange={(e) =>
                        updateSlide(slide.id, {
                          body: (e.target as HTMLTextAreaElement).value,
                        })
                      }
                      placeholder="Slide body content"
                      rows={6}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Presenter Info</Label>
                  <Input
                    className="h-9 rounded-lg border-border/60 text-[13px]"
                    value={slide.presenterInfo ?? ""}
                    onChange={(e) =>
                      updateSlide(slide.id, {
                        presenterInfo: (e.target as HTMLInputElement).value,
                      })
                    }
                    placeholder="Name, title, date..."
                  />
                </div>

                {(hasPicturePh ?? false) && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">
                      <ImageIcon className="mr-1 inline size-3" />
                      Image URL
                    </Label>
                    <Input
                      className="h-9 rounded-lg border-border/60 text-[13px]"
                      value={slide.imageUrl ?? ""}
                      onChange={(e) =>
                        updateSlide(slide.id, {
                          imageUrl: (e.target as HTMLInputElement).value,
                        })
                      }
                      placeholder="https://..."
                    />
                    <div className="space-y-1.5 mt-2">
                      <Label className="text-[11px] font-medium text-muted-foreground">Image Prompt</Label>
                      <Input
                        className="h-9 rounded-lg border-border/60 text-[13px]"
                        value={slide.imagePrompt ?? ""}
                        onChange={(e) =>
                          updateSlide(slide.id, {
                            imagePrompt: (e.target as HTMLInputElement).value,
                          })
                        }
                        placeholder="Describe the image to generate..."
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    <StickyNote className="mr-1 inline size-3" />
                    Speaker Notes
                  </Label>
                  <Textarea
                    className="rounded-lg border-border/60 text-[13px]"
                    value={slide.notes ?? ""}
                    onChange={(e) =>
                      updateSlide(slide.id, {
                        notes: (e.target as HTMLTextAreaElement).value,
                      })
                    }
                    placeholder="Notes for the presenter..."
                    rows={4}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <LayoutPicker
        open={layoutPickerOpen}
        onOpenChange={setLayoutPickerOpen}
        mode="change"
        targetSlideId={expandedSlideId}
      />
    </div>
  );
}
