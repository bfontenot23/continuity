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

export interface Branch {
  id: string;
  description?: string;
  lineStyle?: 'solid' | 'dashed'; // Default: solid
  startEndpointStyle?: 'dot' | 'arrow' | 'none'; // Default: dot
  endEndpointStyle?: 'dot' | 'arrow' | 'none'; // Default: dot
  // Start point: reference to a continuity and chapter this branch starts from
  startContinuityId: string;
  startChapterId?: string; // Optional: chapter ID this branch is anchored to (for layout recalculation)
  startPosition: number; // Grid position (0-based), recalculated when chapters change
  // End point: reference to a different continuity and chapter this branch ends at
  endContinuityId: string;
  endChapterId?: string; // Optional: chapter ID this branch is anchored to (for layout recalculation)
  endPosition: number; // Grid position (0-based), recalculated when chapters change
}

export interface Textbox {
  id: string;
  content: string; // Markdown content
  x: number; // World X position (not grid-locked)
  y: number; // World Y position (not grid-locked)
  width: number; // Width in pixels
  height: number; // Height in pixels
  fontSize: number; // Font size in pixels
  alignX?: 'left' | 'center' | 'right'; // Horizontal alignment (default: left)
  alignY?: 'top' | 'middle' | 'bottom'; // Vertical alignment (default: top)
}

export interface Line {
  id: string;
  gridX1: number; // Starting grid X position (locked to grid)
  gridY1: number; // Starting grid Y position (locked to grid)
  gridX2: number; // Ending grid X position (locked to grid)
  gridY2: number; // Ending grid Y position (locked to grid)
  lineStyle?: 'solid' | 'dashed'; // Default: solid
  startEndpointStyle?: 'dot' | 'arrow' | 'none'; // Default: dot
  endEndpointStyle?: 'dot' | 'arrow' | 'none'; // Default: dot
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
  branches: Branch[]; // Branches originating from or ending at this timeline
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created: number;
  modified: number;
  continuities: Continuity[];
  textboxes: Textbox[]; // Free-floating textboxes with markdown support
  lines: Line[]; // Free-floating lines with grid-locked positions
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
    textboxes: [],
    lines: [],
  };
}

export function createContinuity(name: string): Continuity {
  return {
    id: generateId(),
    name,
    chapters: [],
    arcs: [],
    branches: [],
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

export function createBranch(
  startContinuityId: string,
  startPosition: number,
  endContinuityId: string,
  endPosition: number
): Branch {
  return {
    id: generateId(),
    startContinuityId,
    startPosition,
    endContinuityId,
    endPosition,
    lineStyle: 'solid',
    startEndpointStyle: 'none',
    endEndpointStyle: 'arrow',
  };
}

export function createTextbox(
  x: number,
  y: number,
  width: number = 100,
  height: number = 60,
  fontSize: number = 14
): Textbox {
  return {
    id: generateId(),
    content: 'New textbox',
    x,
    y,
    width,
    height,
    fontSize,
    alignX: 'left',
    alignY: 'top',
  };
}

export function createLine(
  gridX1: number,
  gridY1: number,
  gridX2: number,
  gridY2: number
): Line {
  return {
    id: generateId(),
    gridX1,
    gridY1,
    gridX2,
    gridY2,
    lineStyle: 'solid',
    startEndpointStyle: 'none',
    endEndpointStyle: 'none',
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
