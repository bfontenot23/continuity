export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function parseRgbaColor(value: string | undefined, fallback: RgbaColor): RgbaColor {
  if (!value) return { ...fallback };
  const hex = value.match(/^#([\da-f]{6})([\da-f]{2})?$/i);
  if (hex) {
    return {
      r: Number.parseInt(hex[1].slice(0, 2), 16),
      g: Number.parseInt(hex[1].slice(2, 4), 16),
      b: Number.parseInt(hex[1].slice(4, 6), 16),
      a: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const rgba = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!rgba) return { ...fallback };
  return {
    r: clamp(Math.round(Number(rgba[1])), 0, 255),
    g: clamp(Math.round(Number(rgba[2])), 0, 255),
    b: clamp(Math.round(Number(rgba[3])), 0, 255),
    a: clamp(rgba[4] === undefined ? 1 : Number(rgba[4]), 0, 1),
  };
}

export function rgbaToCss(color: RgbaColor): string {
  const alpha = Math.round(clamp(color.a, 0, 1) * 100) / 100;
  return `rgba(${clamp(Math.round(color.r), 0, 255)}, ${clamp(Math.round(color.g), 0, 255)}, ${clamp(Math.round(color.b), 0, 255)}, ${alpha})`;
}

export function rgbaToHex(color: RgbaColor): string {
  return `#${[color.r, color.g, color.b]
    .map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}
