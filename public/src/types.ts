/**
 * Core data models for the Continuity app
 * All .cty files are JSON representations of these structures
 */

export interface Arc {
  id: string;
  name: string;
  description?: string;
  order: number; // Visual order in the timeline
  color: string; // Hex color for arc visualization
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  content?: string;
  timestamp: number; // Timeline position (whole numbers only, determines visual order)
  arcId?: string; // Reference to parent arc (optional)
  gridLength?: number; // Manual grid length (0 or undefined = auto-calculate from title)
}



export interface Continuity {
  id: string;
  name: string;
  description?: string;
  color?: string; // For timeline visualization
  x?: number; // Timeline X position in world coordinates
  y?: number; // Timeline Y position in world coordinates
  chapters: Chapter[];
  arcs: Arc[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created: number;
  modified: number;
  continuities: Continuity[];
}

// Helper functions for working with these models
export function createProject(title: string): Project {
  const now = Date.now();
  return {
    id: generateId(),
    title,
    created: now,
    modified: now,
    continuities: [],
  };
}

export function createContinuity(name: string): Continuity {
  return {
    id: generateId(),
    name,
    chapters: [],
    arcs: [],
  };
}

export function createArc(name: string, order: number): Arc {
  return {
    id: generateId(),
    name,
    order,
    color: generateRandomColor(),
  };
}

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 20); // 60-80%
  const lightness = 45 + Math.floor(Math.random() * 15); // 45-60%
  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
  const sDecimal = s / 100;
  const lDecimal = l / 100;
  
  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

export function createChapter(
  title: string,
  arcId: string | undefined,
  timestamp: number,
  gridLength?: number
): Chapter {
  return {
    id: generateId(),
    title,
    arcId,
    timestamp,
    gridLength: gridLength || 0,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
