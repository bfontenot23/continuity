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
  timestamp: number; // Timeline position (can be any numeric scale)
  arcId: string; // Reference to parent arc
  order: number;
}

export interface BranchPoint {
  id: string;
  chapterId: string; // Chapter where the branch occurs
  name: string;
  description?: string;
}

export interface ContinuityBranch {
  id: string;
  fromContinuityId: string;
  toContinuityId: string;
  branchPointId?: string; // Link to where it branches
  mergePointChapterId?: string; // Where it merges back
  description?: string;
}

export interface Continuity {
  id: string;
  name: string;
  description?: string;
  color?: string; // For timeline visualization
  chapters: Chapter[];
  arcs: Arc[];
  branches: ContinuityBranch[]; // Branches to other continuities
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
    branches: [],
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
  order: number
): Chapter {
  return {
    id: generateId(),
    title,
    arcId,
    timestamp,
    order,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
