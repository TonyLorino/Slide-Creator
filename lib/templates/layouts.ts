import type { LayoutDef, LayoutCategory } from "./types";
import layoutData from "./layouts.json";

export const LAYOUTS: LayoutDef[] = layoutData.layouts as LayoutDef[];

export const LAYOUT_MAP: Record<string, LayoutDef> = {};
for (const layout of LAYOUTS) {
  LAYOUT_MAP[layout.name] = layout;
}

export const LAYOUTS_BY_CATEGORY: Record<LayoutCategory, LayoutDef[]> = {
  title: [],
  contents: [],
  divider: [],
  statement: [],
  content: [],
  twoColumn: [],
  asymmetric: [],
  boldTitle: [],
  copyImage: [],
  titleOnly: [],
  blank: [],
  close: [],
};

for (const layout of LAYOUTS) {
  const cat = layout.category as LayoutCategory;
  if (LAYOUTS_BY_CATEGORY[cat]) {
    LAYOUTS_BY_CATEGORY[cat].push(layout);
  }
}

export const CATEGORY_LABELS: Record<LayoutCategory, string> = {
  title: "Title Slides",
  contents: "Contents / TOC",
  divider: "Dividers",
  statement: "Statements",
  content: "Content",
  twoColumn: "Two Column",
  asymmetric: "Asymmetric",
  boldTitle: "Bold Title",
  copyImage: "Copy + Image",
  titleOnly: "Title Only",
  blank: "Blank",
  close: "Close / End",
};

export const SLIDE_WIDTH = layoutData.slideWidth;
export const SLIDE_HEIGHT = layoutData.slideHeight;
