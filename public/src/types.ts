/**
 * Core data models for the Continuity app
 * All .cty files are JSON representations of these structures
 */

export interface Arc {
  id: string;
  name: string;
  description?: string;
  order: number; // Visual order in the timeline
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  content?: string;
  timestamp: number; // Timeline position (whole numbers only, determines visual order)
  arcId: string; // Reference to parent arc
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
  };
}

export function createChapter(
  title: string,
  arcId: string,
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
