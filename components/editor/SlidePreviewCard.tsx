"use client";

import * as React from "react";
import { LAYOUT_MAP } from "@/lib/templates/layouts";
import { BRAND_COLORS } from "@/lib/templates/theme";
import type { SlideData, PlaceholderDef } from "@/lib/templates/types";
import { Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlidePreviewCardProps {
  slide: SlideData;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const SLIDE_RENDER_W = 320;
const SLIDE_RENDER_H = 180;
const TEMPLATE_W = 13.333;
const TEMPLATE_H = 7.5;

const BULLET_RE = /^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s*/;

function stripBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(BULLET_RE, ""))
    .filter((line) => line.trim() !== "");
}

function inchToPx(inch: number, axis: "x" | "y"): number {
  return axis === "x"
    ? (inch / TEMPLATE_W) * SLIDE_RENDER_W
    : (inch / TEMPLATE_H) * SLIDE_RENDER_H;
}

function getBackgroundColor(layout: ReturnType<typeof getLayout>, slide: SlideData): string {
  if (layout) return layout.background;
  const key = slide.layoutKey.toLowerCase();
  if (key.includes("dark") || key.includes("black")) return BRAND_COLORS.black;
  if (key.includes("colour") || key.includes("color")) return BRAND_COLORS.blue;
  if (key.includes("statement")) return BRAND_COLORS.sage;
  return BRAND_COLORS.white;
}

function getLayout(layoutKey: string) {
  return LAYOUT_MAP[layoutKey] ?? null;
}

function getTextColor(bg: string): string {
  const dark = ["#000000", "#01454F", "#1F00FF", "#7700EC"];
  return dark.includes(bg.toUpperCase()) ? "#FFFFFF" : "#000000";
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
  const dotSize = Math.max(fontSize * 0.35, 2);
  return (
    <div className="flex flex-col" style={{ gap: fontSize * 0.15 }}>
      {lines.map((line, i) => (
        <div key={i} className="flex items-start" style={{ gap: fontSize * 0.4 }}>
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

function renderPlaceholderContent(
  ph: PlaceholderDef,
  slide: SlideData,
  textColor: string
) {
  const x = inchToPx(ph.x, "x");
  const y = inchToPx(ph.y, "y");
  const w = inchToPx(ph.width, "x");
  const h = inchToPx(ph.height, "y");

  const baseFontScale = SLIDE_RENDER_W / 960;

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
          fontSize: 6 * baseFontScale,
          color: textColor,
          opacity: 0.4,
        }}
      >
        {slide.orderIndex + 1}
      </div>
    );
  }

  if (ph.type === "picture") {
    if (!slide.imageUrl) return null;
    return (
      <div
        key={`ph-${ph.idx}`}
        className="absolute overflow-hidden rounded-sm"
        style={{ left: x, top: y, width: w, height: h }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.imageUrl} alt="" className="size-full object-cover" />
      </div>
    );
  }

  let content: string | undefined;
  let fontSize: number;
  let isBody = false;

  if (ph.type === "title") {
    content = slide.title;
    fontSize = (ph.fontSize ?? 24) * baseFontScale;
  } else if (ph.type === "subtitle") {
    content = slide.subtitle;
    fontSize = (ph.fontSize ?? 14) * baseFontScale;
  } else {
    const name = ph.name.toLowerCase();
    if (name.includes("presenter") || name.includes("info")) {
      content = slide.presenterInfo;
    } else {
      content = slide.body;
      isBody = true;
    }
    fontSize = (ph.fontSize ?? 11) * baseFontScale;
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
        fontSize: Math.max(fontSize, 5),
        lineHeight: 1.3,
        color: textColor,
      }}
    >
      {isBody ? (
        <BodyBullets text={content} fontSize={Math.max(fontSize, 5)} color={textColor} />
      ) : (
        <p className="whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}

export function SlidePreviewCard({
  slide,
  index,
  isActive,
  onClick,
  onDelete,
  onDuplicate,
}: SlidePreviewCardProps) {
  const [hovering, setHovering] = React.useState(false);
  const layout = getLayout(slide.layoutKey);
  const bg = getBackgroundColor(layout, slide);
  const textColor = getTextColor(bg);

  return (
    <div
      className={`group relative cursor-pointer rounded-xl transition-all duration-200 ${
        isActive
          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          : "ring-1 ring-border/80 hover:ring-2 hover:ring-foreground/20 hover:shadow-lg hover:shadow-black/[0.04]"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="absolute -top-2.5 left-3 z-10">
        <span className="inline-flex h-5 items-center rounded-md bg-background px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground shadow-sm ring-1 ring-border/60">
          {index + 1}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          width: SLIDE_RENDER_W,
          height: SLIDE_RENDER_H,
          backgroundColor: bg,
        }}
      >
        {layout ? (
          layout.placeholders.map((ph) =>
            renderPlaceholderContent(ph, slide, textColor)
          )
        ) : (
          <div className="flex size-full flex-col items-center justify-center p-4">
            {slide.title && (
              <p
                className="mb-1 text-center font-medium"
                style={{ fontSize: 12, color: textColor }}
              >
                {slide.title}
              </p>
            )}
            {slide.body && (
              <p
                className="text-center"
                style={{ fontSize: 8, color: textColor, opacity: 0.8 }}
              >
                {slide.body.slice(0, 120)}
              </p>
            )}
          </div>
        )}
      </div>

      {hovering && (
        <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5">
          <Button
            variant="secondary"
            size="icon-xs"
            className="rounded-lg bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate"
          >
            <Copy className="size-3" />
          </Button>
          <Button
            variant="destructive"
            size="icon-xs"
            className="rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      )}

      <div className="mt-1.5 px-1">
        <p className="truncate text-[10px] text-muted-foreground/70">
          {slide.layoutKey}
        </p>
      </div>
    </div>
  );
}
