/**
 * Color utilities for translating between web colors (hex, rgba) and Figma RGB/SolidPaint (0..1).
 */

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses hex color (e.g. #FFF, #FFFFFF, #FFFFFF80) or rgba string into normalized 0..1 values.
 */
export function parseColor(colorStr?: string): ParsedColor | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();

  // Hex color #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      const a = parseInt(hex[3] + hex[3], 16) / 255;
      return { r, g, b, a };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
  }

  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }

  // Named CSS color fallbacks
  const namedColors: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    transparent: '#00000000',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    gray: '#6b7280',
    slate: '#64748b'
  };

  if (namedColors[str]) {
    return parseColor(namedColors[str]);
  }

  return null;
}

/**
 * Creates a Figma SolidPaint object from a color string and optional opacity.
 */
export function createSolidPaint(colorStr?: string, opacity?: number): SolidPaint[] {
  const parsed = parseColor(colorStr);
  if (!parsed) return [];

  const effectiveOpacity = opacity !== undefined ? opacity : parsed.a;

  return [
    {
      type: 'SOLID',
      color: { r: parsed.r, g: parsed.g, b: parsed.b },
      opacity: effectiveOpacity
    }
  ];
}

/**
 * Converts a Figma RGB (0..1) to a hex string #RRGGBB
 */
export function figmaRgbToHex(color: { r: number; g: number; b: number }): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}
