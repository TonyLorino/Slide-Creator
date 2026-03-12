export type LayoutCategory =
  | "title"
  | "contents"
  | "divider"
  | "statement"
  | "content"
  | "twoColumn"
  | "asymmetric"
  | "boldTitle"
  | "copyImage"
  | "titleOnly"
  | "blank"
  | "close";

export interface PlaceholderDef {
  idx: number;
  type: "title" | "subtitle" | "body" | "picture" | "slideNumber";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultText?: string | null;
  fontSize?: number | null;
}

export interface ShapeDef {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutDef {
  index: number;
  name: string;
  category: LayoutCategory;
  background: string;
  placeholders: PlaceholderDef[];
  shapes: ShapeDef[];
  hasLogo: boolean;
  logoPosition: string | null;
  hasSlideNumber: boolean;
  hasCornerDecorations: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  slideUpdates?: SlideUpdate | null;
}

export interface SlideUpdate {
  action: "replace_all" | "update_slides" | "add_slides" | "delete_slides";
  slides: SlideData[];
}

export interface SlideData {
  id: string;
  orderIndex: number;
  layoutKey: string;
  title?: string;
  subtitle?: string;
  body?: string;
  presenterInfo?: string;
  imageUrl?: string;
  imagePrompt?: string;
  notes?: string;
  tableData?: string[][];
  chartData?: {
    chartType: string;
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor?: string | string[] }[];
  };
}

export interface DeckData {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}
