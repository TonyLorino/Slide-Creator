export const SLIDE_WIDTH_IN = 13.333;
export const SLIDE_HEIGHT_IN = 7.5;
export const SLIDE_ASPECT_RATIO = SLIDE_WIDTH_IN / SLIDE_HEIGHT_IN;

export const DPI = 96;
export const SLIDE_WIDTH_PX = Math.round(SLIDE_WIDTH_IN * DPI);
export const SLIDE_HEIGHT_PX = Math.round(SLIDE_HEIGHT_IN * DPI);

export const EMU_PER_INCH = 914400;

export const THEME_COLORS = {
  dk1: "#000000",
  lt1: "#FFFFFF",
  dk2: "#1F00FF",
  lt2: "#E7E6E6",
  accent1: "#000000",
  accent2: "#7700EC",
  accent3: "#FCCF00",
  accent4: "#00D87D",
  accent5: "#01454F",
  accent6: "#8AAEFF",
  hlink: "#1F00FF",
  folHlink: "#00E5FA",
} as const;

export const BRAND_COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  blue: "#1F00FF",
  purple: "#7700EC",
  yellow: "#FCCF00",
  green: "#00D87D",
  darkTeal: "#01454F",
  lightBlue: "#8AAEFF",
  cyan: "#00E5FA",
  lightCyan: "#99F5FD",
  sage: "#9AB5B9",
  lightGray: "#E7E6E6",
} as const;

export const FONT_FAMILY = "Arial";
export const DEFAULT_FONT_SIZES = {
  title: 30,
  subtitle: 18,
  body: 14,
  caption: 10,
} as const;

export const LOGO_POSITIONS = {
  titleTopLeft: { x: 0.556, y: 0.556, width: 2.036, height: 0.72 },
  contentFooter: { x: 0.556, y: 7.021, width: 1.387, height: 0.207 },
  closeBottomLeft: { x: 0.564, y: 6.225, width: 2.036, height: 0.72 },
} as const;

export const SLIDE_NUMBER_POSITION = {
  x: 12.351,
  y: 7.063,
  width: 0.417,
  height: 0.148,
} as const;
