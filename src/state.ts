/**
 * Main application state management
 */

import { Project, Continuity, Chapter, Arc, Branch, Textbox, Line, generateId } from './types';
import { LocalStorageManager } from './fileManager';
import { getChapterPositions } from './timelineLayout';

type StateChangeListener = (state: AppState) => void;

export interface AppState {
  currentProject: Project | null;
  selectedContinuityId: string | null;
  selectedChapterId: string | null;
  selectedBranchId: string | null;
  selectedTextboxId: string | null;
  selectedLineId: string | null;
}

export interface CanvasDeletion {
  timelineIds: string[];
  chapterIds: string[];
  branchIds: string[];
  textboxIds: string[];
  lineIds: string[];
}

export interface CanvasElements {
  textboxes: Textbox[];
  lines: Line[];
}

export interface CanvasPasteResult {
  timelineIds: string[];
  textboxIds: string[];
  lineIds: string[];
}

export interface CanvasLinePosition {
  id: string;
  gridX1: number;
  gridY1: number;
  gridX2: number;
  gridY2: number;
}

export interface CanvasTimelinePosition { id: string; x: number; y: number; }
export interface CanvasTextboxPosition { id: string; x: number; y: number; }

export class AppStateManager {
  private state: AppState;
  private listeners: Set<StateChangeListener> = new Set();
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  private lastProjectSnapshot: Project | null = null;
  private readonly historyLimit = 20;
  private timelineClipboard: { continuities: Continuity[]; branches: Branch[]; elements: CanvasElements } | null = null;

  constructor() {
    this.state = {
      currentProject: null,
      selectedContinuityId: null,
      selectedChapterId: null,
      selectedBranchId: null,
      selectedTextboxId: null,
      selectedLineId: null,
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  setProject(project: Project): void {
    this.state.currentProject = project;
    this.undoStack = [];
    this.redoStack = [];
    this.lastProjectSnapshot = this.cloneProject(project);
    this.timelineClipboard = null;
    this.notifyListeners();
  }

  copyTimelinesToClipboard(
    timelineIds: string[],
    elements: CanvasElements,
    cut = false,
    deletion?: CanvasDeletion,
  ): boolean {
    const project = this.state.currentProject;
    const selectedIds = new Set(timelineIds);
    if (!project || !selectedIds.size) return false;
    const continuities = project.continuities
      .filter(continuity => selectedIds.has(continuity.id))
      .map(continuity => ({ ...this.cloneValue(continuity), branches: [] }));
    if (!continuities.length) return false;

    const branchesById = new Map<string, Branch>();
    for (const continuity of project.continuities) {
      for (const branch of continuity.branches || []) {
        if (selectedIds.has(branch.startContinuityId) && selectedIds.has(branch.endContinuityId)) {
          branchesById.set(branch.id, this.cloneValue(branch));
        }
      }
    }
    this.timelineClipboard = {
      continuities,
      branches: [...branchesById.values()],
      elements: {
        textboxes: elements.textboxes.map(textbox => this.cloneValue(textbox)),
        lines: elements.lines.map(line => this.cloneValue(line)),
      },
    };

    if (cut) {
      this.applyCanvasDeletion(project, deletion ?? {
        timelineIds,
        chapterIds: [],
        branchIds: [],
        textboxIds: elements.textboxes.map(textbox => textbox.id),
        lineIds: elements.lines.map(line => line.id),
      });
      project.modified = Date.now();
      this.notifyListeners();
    }
    return true;
  }

  hasTimelineClipboard(): boolean {
    return Boolean(this.timelineClipboard?.continuities.length);
  }

  clearTimelineClipboard(): void {
    this.timelineClipboard = null;
  }

  pasteTimelinesFromClipboard(): CanvasPasteResult {
    const project = this.state.currentProject;
    const clipboard = this.timelineClipboard;
    if (!project || !clipboard?.continuities.length) return { timelineIds: [], textboxIds: [], lineIds: [] };

    const timelineIds = new Map<string, string>();
    const chapterIds = new Map<string, string>();
    const arcIds = new Map<string, string>();
    for (const continuity of clipboard.continuities) {
      timelineIds.set(continuity.id, generateId());
      for (const chapter of continuity.chapters) chapterIds.set(chapter.id, generateId());
      for (const arc of continuity.arcs) arcIds.set(arc.id, generateId());
    }

    const copies: Continuity[] = clipboard.continuities.map(continuity => ({
      ...this.cloneValue(continuity),
      id: timelineIds.get(continuity.id)!,
      name: `${continuity.name} Copy`,
      x: (continuity.x ?? 0) + 50,
      y: (continuity.y ?? 0) + 50,
      arcs: continuity.arcs.map(arc => ({ ...this.cloneValue(arc), id: arcIds.get(arc.id)! })),
      chapters: continuity.chapters.map(chapter => ({
        ...this.cloneValue(chapter),
        id: chapterIds.get(chapter.id)!,
        arcId: chapter.arcId ? arcIds.get(chapter.arcId) : undefined,
      })),
      branches: [],
    }));
    const copiesById = new Map(copies.map(continuity => [continuity.id, continuity]));

    for (const branch of clipboard.branches) {
      const startContinuityId = timelineIds.get(branch.startContinuityId);
      const endContinuityId = timelineIds.get(branch.endContinuityId);
      if (!startContinuityId || !endContinuityId) continue;
      const copy: Branch = {
        ...this.cloneValue(branch),
        id: generateId(),
        startContinuityId,
        endContinuityId,
        startChapterId: branch.startChapterId ? chapterIds.get(branch.startChapterId) : undefined,
        endChapterId: branch.endChapterId ? chapterIds.get(branch.endChapterId) : undefined,
      };
      copiesById.get(startContinuityId)?.branches.push(copy);
      if (endContinuityId !== startContinuityId) copiesById.get(endContinuityId)?.branches.push(copy);
    }

    project.continuities.push(...copies);
    const textboxes = clipboard.elements.textboxes.map(textbox => ({
      ...this.cloneValue(textbox),
      id: generateId(),
      x: textbox.x + 20,
      y: textbox.y + 20,
    }));
    const lines = clipboard.elements.lines.map(line => ({
      ...this.cloneValue(line),
      id: generateId(),
      gridX1: line.gridX1 + 1,
      gridY1: line.gridY1 + 1,
      gridX2: line.gridX2 + 1,
      gridY2: line.gridY2 + 1,
    }));
    (project.textboxes ??= []).push(...textboxes);
    (project.lines ??= []).push(...lines);
    project.modified = Date.now();
    this.notifyListeners();
    return {
      timelineIds: copies.map(continuity => continuity.id),
      textboxIds: textboxes.map(textbox => textbox.id),
      lineIds: lines.map(line => line.id),
    };
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  undo(): void {
    if (!this.state.currentProject || !this.undoStack.length) return;
    this.redoStack.push(this.cloneProject(this.state.currentProject));
    this.state.currentProject = this.undoStack.pop()!;
    this.lastProjectSnapshot = this.cloneProject(this.state.currentProject);
    this.notifyListeners(false);
  }

  redo(): void {
    if (!this.state.currentProject || !this.redoStack.length) return;
    this.undoStack.push(this.cloneProject(this.state.currentProject));
    this.state.currentProject = this.redoStack.pop()!;
    this.lastProjectSnapshot = this.cloneProject(this.state.currentProject);
    this.notifyListeners(false);
  }

  /** Publish the current state after an interaction that does not mutate it directly. */
  refresh(): void {
    this.notifyListeners();
  }

  selectContinuity(continuityId: string | null): void {
    this.state.selectedContinuityId = continuityId;
    this.state.selectedChapterId = null; // Reset chapter selection
    this.notifyListeners();
  }

  selectChapter(chapterId: string | null): void {
    this.state.selectedChapterId = chapterId;
    this.state.selectedBranchId = null; // Reset branch selection when selecting a chapter
    this.state.selectedTextboxId = null; // Reset textbox selection
    this.notifyListeners();
  }

  selectBranch(branchId: string | null): void {
    this.state.selectedBranchId = branchId;
    this.state.selectedChapterId = null; // Reset chapter selection when selecting a branch
    this.state.selectedTextboxId = null; // Reset textbox selection
    this.notifyListeners();
  }

  selectTextbox(textboxId: string | null): void {
    this.state.selectedTextboxId = textboxId;
    this.state.selectedChapterId = null; // Reset chapter selection
    this.state.selectedBranchId = null; // Reset branch selection
    this.state.selectedLineId = null; // Reset line selection
    this.notifyListeners();
  }

  selectLine(lineId: string | null): void {
    this.state.selectedLineId = lineId;
    this.state.selectedChapterId = null; // Reset chapter selection
    this.state.selectedBranchId = null; // Reset branch selection
    this.state.selectedTextboxId = null; // Reset textbox selection
    this.notifyListeners();
  }

  addContinuity(continuity: Continuity): void {
    if (this.state.currentProject) {
      this.state.currentProject.continuities.push(continuity);
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  updateContinuity(continuityId: string, updates: Partial<Continuity>): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        Object.assign(continuity, updates);
        if ('headGridLength' in updates) {
          this.recalculateBranchPositions(continuity);
        }
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /** Persist a focused text edit without rebuilding the application UI. */
  updateContinuitySilently(continuityId: string, updates: Partial<Continuity>): void {
    const continuity = this.state.currentProject?.continuities.find(c => c.id === continuityId);
    if (!continuity) return;

    Object.assign(continuity, updates);
    if ('headGridLength' in updates) {
      this.recalculateBranchPositions(continuity);
    }
    this.state.currentProject!.modified = Date.now();
    this.persistProject();
  }

  removeContinuity(continuityId: string): void {
    if (this.state.currentProject) {
      this.state.currentProject.continuities = this.state.currentProject.continuities.filter(
        c => c.id !== continuityId
      );
      if (this.state.selectedContinuityId === continuityId) {
        this.state.selectedContinuityId = null;
      }
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  addChapter(continuityId: string, chapter: Chapter): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        // Always append to the end with next sequential timestamp
        const maxTimestamp = continuity.chapters.reduce((max, ch) => Math.max(max, ch.timestamp), 0);
        chapter.timestamp = maxTimestamp + 1;
        continuity.chapters.push(chapter);
        
        // Recalculate branch positions since chapter layout changed
        this.recalculateBranchPositions(continuity);
        
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /**
   * Insert a chapter at a specific index position, shifting all subsequent timestamps.
   * @param continuityId - The continuity to add the chapter to
   * @param chapter - The chapter to insert
   * @param targetIndex - The index position to insert at (0-based). If undefined, appends to end.
   */
  insertChapter(continuityId: string, chapter: Chapter, targetIndex?: number): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        // If no target index specified, add to end
        if (targetIndex === undefined) {
          const maxTimestamp = continuity.chapters.reduce((max, ch) => Math.max(max, ch.timestamp), 0);
          chapter.timestamp = maxTimestamp + 1;
          continuity.chapters.push(chapter);
        } else {
          // Sort chapters by current timestamp
          const sortedChapters = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
          
          // Insert new chapter at target position
          sortedChapters.splice(targetIndex, 0, chapter);
          
          // Reassign timestamps as whole numbers starting from 1
          sortedChapters.forEach((ch, index) => {
            ch.timestamp = index + 1;
          });
          
          // Add the new chapter to the actual continuity array
          continuity.chapters.push(chapter);
        }
        
        // Recalculate branch positions since chapter layout changed
        this.recalculateBranchPositions(continuity);
        
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /** Insert an ordered chapter group as one undoable operation. */
  insertChapters(continuityId: string, chapters: Chapter[], targetIndex: number): void {
    const continuity = this.state.currentProject?.continuities.find(candidate => candidate.id === continuityId);
    if (!continuity || !chapters.length) return;
    const sorted = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
    const index = Math.max(0, Math.min(sorted.length, targetIndex));
    sorted.splice(index, 0, ...chapters);
    sorted.forEach((chapter, position) => { chapter.timestamp = position + 1; });
    continuity.chapters = sorted;
    this.recalculateBranchPositions(continuity);
    this.state.currentProject!.modified = Date.now();
    this.notifyListeners();
  }

  updateChapter(continuityId: string, chapterId: string, updates: Partial<Chapter>): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        const chapter = continuity.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
          Object.assign(chapter, updates);
          // If gridLength or timestamp changed, recalculate branch positions on this timeline
          // timestamp changes mean chapter reordering, which affects branch positions
          if (('gridLength' in updates || 'timestamp' in updates || 'title' in updates) && continuity.branches) {
            this.recalculateBranchPositions(continuity);
          }
          this.state.currentProject.modified = Date.now();
          this.notifyListeners();
        }
      }
    }
  }

  /** Persist a focused text edit without rebuilding the application UI. */
  updateChapterSilently(continuityId: string, chapterId: string, updates: Partial<Chapter>): void {
    const continuity = this.state.currentProject?.continuities.find(c => c.id === continuityId);
    const chapter = continuity?.chapters.find(ch => ch.id === chapterId);
    if (!continuity || !chapter) return;

    Object.assign(chapter, updates);
    if ('gridLength' in updates || 'timestamp' in updates || 'title' in updates) {
      this.recalculateBranchPositions(continuity);
    }
    this.state.currentProject!.modified = Date.now();
    this.persistProject();
  }

  /**
   * Update branch chapter references when a chapter is deleted.
   * - For start points: Link to the chapter immediately BEFORE the deleted chapter
   * - For end points: Link to the chapter immediately AFTER the deleted chapter
   */
  private updateBranchReferencesAfterChapterDeletion(continuity: Continuity, deletedChapterId: string): void {
    if (!this.state.currentProject) return;

    // Find the deleted chapter's position in the sequence
    const sortedChapters = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
    const deletedIndex = sortedChapters.findIndex(ch => ch.id === deletedChapterId);
    if (deletedIndex === -1) return;

    // Get adjacent chapters
    const chapterBefore = deletedIndex > 0 ? sortedChapters[deletedIndex - 1] : undefined;
    const chapterAfter = deletedIndex < sortedChapters.length - 1 ? sortedChapters[deletedIndex + 1] : undefined;

    // Update all branches in all continuities that reference the deleted chapter
    this.state.currentProject.continuities.forEach(cont => {
      if (!cont.branches) return;
      
      cont.branches.forEach(branch => {
        // Update start chapter reference if it matches deleted chapter
        // Start point should link to chapter BEFORE deleted chapter
        if (branch.startContinuityId === continuity.id && branch.startChapterId === deletedChapterId) {
          branch.startChapterId = chapterBefore?.id; // Will be undefined if no chapter before
        }
        
        // Update end chapter reference if it matches deleted chapter
        // End point should link to chapter AFTER deleted chapter
        if (branch.endContinuityId === continuity.id && branch.endChapterId === deletedChapterId) {
          branch.endChapterId = chapterAfter?.id; // Will be undefined if no chapter after
        }
      });
    });
  }

  /**
   * Recalculate branch positions when chapter widths change.
   * Branches store chapter IDs to maintain their associations even when
   * the timeline layout changes due to chapter gridLength modifications.
   */
  private recalculateBranchPositions(continuity: Continuity): void {
    if (!this.state.currentProject) return;

    const positions = getChapterPositions(continuity.chapters, continuity.headGridLength);

    // Update ALL branches in ALL continuities that reference this continuity
    this.state.currentProject.continuities.forEach(cont => {
      if (!cont.branches) return;
      
      cont.branches.forEach(branch => {
        // Recalculate start position if branch starts on this continuity
        if (branch.startContinuityId === continuity.id && branch.startChapterId) {
          // Branch is anchored to left chapter - update to chapter's END position
          const chapterPos = positions.get(branch.startChapterId);
          if (chapterPos) {
            branch.startPosition = chapterPos.x + chapterPos.width;
          }
        }
        
        // Recalculate end position if branch ends on this continuity
        if (branch.endContinuityId === continuity.id && branch.endChapterId) {
          // Branch is anchored to right chapter - update to chapter's START position
          const chapterPos = positions.get(branch.endChapterId);
          if (chapterPos) {
            branch.endPosition = chapterPos.x;
          }
        }
      });
    });
  }

  removeChapter(continuityId: string, chapterId: string): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        // Before removing, update any branches that reference this chapter
        this.updateBranchReferencesAfterChapterDeletion(continuity, chapterId);
        
        continuity.chapters = continuity.chapters.filter(ch => ch.id !== chapterId);
        if (this.state.selectedChapterId === chapterId) {
          this.state.selectedChapterId = null;
        }
        
        // Recalculate branch positions since chapter layout changed
        this.recalculateBranchPositions(continuity);
        
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /**
   * Reorder a chapter by moving it to a specific position in the timeline.
   * All timestamps are shifted to maintain whole number ordering.
   * @param continuityId - The continuity containing the chapter
   * @param chapterId - The chapter to move
   * @param targetIndex - The index position to insert the chapter (0-based)
   */
  reorderChapter(continuityId: string, chapterId: string, targetIndex: number): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        const chapter = continuity.chapters.find(ch => ch.id === chapterId);
        if (!chapter) return;

        // Sort chapters by current timestamp to get current order
        const sortedChapters = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
        
        // Find current index of the chapter
        const currentIndex = sortedChapters.findIndex(ch => ch.id === chapterId);
        if (currentIndex === -1) return;

        // Remove chapter from current position
        sortedChapters.splice(currentIndex, 1);

        // Adjust target index when dragging a chapter forward in the list because removing
        // the original position shifts later indices left by one.
        let adjustedTargetIndex = targetIndex;
        if (adjustedTargetIndex > currentIndex) {
          adjustedTargetIndex -= 1;
        }

        // Clamp to valid bounds to avoid splicing out of range
        adjustedTargetIndex = Math.max(0, Math.min(sortedChapters.length, adjustedTargetIndex));
        
        // Insert at target position
        sortedChapters.splice(adjustedTargetIndex, 0, chapter);
        
        // Reassign timestamps as whole numbers starting from 1
        sortedChapters.forEach((ch, index) => {
          ch.timestamp = index + 1;
        });

        // Recalculate branch positions since chapter layout changed
        this.recalculateBranchPositions(continuity);

        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /** Reorder adjacent chapters together while preserving their relative order. */
  reorderChapters(continuityId: string, chapterIds: string[], targetIndex: number): void {
    if (chapterIds.length < 2) {
      if (chapterIds[0]) this.reorderChapter(continuityId, chapterIds[0], targetIndex);
      return;
    }
    const continuity = this.state.currentProject?.continuities.find(candidate => candidate.id === continuityId);
    if (!continuity) return;
    const ids = new Set(chapterIds);
    const sorted = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
    const moving = sorted.filter(chapter => ids.has(chapter.id));
    if (moving.length !== chapterIds.length) return;
    const removedBeforeTarget = sorted.slice(0, targetIndex).filter(chapter => ids.has(chapter.id)).length;
    const remaining = sorted.filter(chapter => !ids.has(chapter.id));
    const insertionIndex = Math.max(0, Math.min(remaining.length, targetIndex - removedBeforeTarget));
    remaining.splice(insertionIndex, 0, ...moving);
    remaining.forEach((chapter, index) => { chapter.timestamp = index + 1; });
    this.recalculateBranchPositions(continuity);
    this.state.currentProject!.modified = Date.now();
    this.notifyListeners();
  }

  addArc(continuityId: string, arc: Arc): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        continuity.arcs.push(arc);
        continuity.arcs.sort((a, b) => a.order - b.order);
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  updateArc(continuityId: string, arcId: string, updates: Partial<Arc>): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        const arc = continuity.arcs.find(a => a.id === arcId);
        if (arc) {
          Object.assign(arc, updates);
          this.state.currentProject.modified = Date.now();
          this.notifyListeners();
        }
      }
    }
  }

  removeArc(continuityId: string, arcId: string): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        continuity.arcs = continuity.arcs.filter(a => a.id !== arcId);
        // Move chapters in deleted arc to first remaining arc
        const firstArc = continuity.arcs[0];
        if (firstArc) {
          continuity.chapters.forEach(ch => {
            if (ch.arcId === arcId) {
              ch.arcId = firstArc.id;
            }
          });
        } else {
          // Remove all chapters in deleted arc if no arcs remain
          continuity.chapters = continuity.chapters.filter(ch => ch.arcId !== arcId);
        }
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  reorderArcs(continuityId: string, fromIndex: number, toIndex: number): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity && fromIndex !== toIndex) {
        // Sort arcs by current order
        const sortedArcs = [...continuity.arcs].sort((a, b) => a.order - b.order);
        
        // Move the arc from fromIndex to toIndex
        const [movedArc] = sortedArcs.splice(fromIndex, 1);
        sortedArcs.splice(toIndex, 0, movedArc);
        
        // Reassign order values
        sortedArcs.forEach((arc, index) => {
          arc.order = index;
        });
        
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  reorderArc(continuityId: string, arcId: string, targetIndex: number): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        const arc = continuity.arcs.find(a => a.id === arcId);
        if (!arc) return;

        // Sort all chapters by timestamp to get current order
        const sortedChapters = [...continuity.chapters].sort((a, b) => a.timestamp - b.timestamp);
        
        // Build arc groups in current chapter order (treating each unassigned chapter individually)
        const arcGroups: { arcId: string | null; chapters: typeof sortedChapters }[] = [];
        let currentArcId: string | null = null;
        let currentGroup: typeof sortedChapters = [];
        
        sortedChapters.forEach(chapter => {
          if (chapter.title === 'Head' || chapter.title === 'Tail') {
            // Head and Tail stay in place, but break groups
            if (currentGroup.length > 0) {
              arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
            }
            currentArcId = null;
            currentGroup = [];
            return;
          }
          
          // Each unassigned chapter is its own unique group
          const chapterArcId = chapter.arcId || `unassigned-${chapter.id}`;
          
          if (chapterArcId !== currentArcId) {
            // New group
            if (currentGroup.length > 0) {
              arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
            }
            currentArcId = chapterArcId;
            currentGroup = [chapter];
          } else {
            // Same arc - add to current group
            currentGroup.push(chapter);
          }
        });
        
        if (currentGroup.length > 0) {
          arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
        }
        
        // Find the group being dragged
        const draggedGroupIndex = arcGroups.findIndex(g => g.arcId === arcId);
        if (draggedGroupIndex === -1) return;
        
        const draggedGroup = arcGroups[draggedGroupIndex];
        
        // Remove the dragged group
        arcGroups.splice(draggedGroupIndex, 1);
        
        // The targetIndex is the position in the arc groups array (including unassigned)
        // Adjust if we removed an item before the target position
        let insertIndex = targetIndex;
        if (draggedGroupIndex < targetIndex) {
          insertIndex = targetIndex - 1;
        }
        
        // Ensure insertIndex is within bounds
        insertIndex = Math.max(0, Math.min(insertIndex, arcGroups.length));
        
        // Insert the dragged group at the new position
        arcGroups.splice(insertIndex, 0, draggedGroup);
        
        // Rebuild the chapter list from arc groups
        const reorderedChapters: typeof sortedChapters = [];
        const headChapter = continuity.chapters.find(ch => ch.title === 'Head');
        const tailChapter = continuity.chapters.find(ch => ch.title === 'Tail');
        
        if (headChapter) reorderedChapters.push(headChapter);
        
        arcGroups.forEach(group => {
          reorderedChapters.push(...group.chapters);
        });
        
        if (tailChapter) reorderedChapters.push(tailChapter);
        
        // Reassign timestamps as whole numbers
        reorderedChapters.forEach((ch, index) => {
          ch.timestamp = index + 1;
        });

        // Update arc order values based on the new chapter positions
        // Collect arcs in the order they appear in the reordered groups
        const orderedArcIds: string[] = [];
        arcGroups.forEach(group => {
          if (group.arcId && !group.arcId.startsWith('unassigned-') && !orderedArcIds.includes(group.arcId)) {
            orderedArcIds.push(group.arcId);
          }
        });
        
        // Reassign order values to arcs
        orderedArcIds.forEach((arcId, index) => {
          const arc = continuity.arcs.find(a => a.id === arcId);
          if (arc) {
            arc.order = index;
          }
        });

        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  updateProject(updates: Partial<Project>): void {
    if (this.state.currentProject) {
      Object.assign(this.state.currentProject, updates);
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Add a branch to the project. The branch will be added to both continuities involved.
   * @param branch - The branch to add
   */
  addBranch(branch: Branch): void {
    if (this.state.currentProject) {
      // Find both continuities involved
      const startContinuity = this.state.currentProject.continuities.find(
        c => c.id === branch.startContinuityId
      );
      const endContinuity = this.state.currentProject.continuities.find(
        c => c.id === branch.endContinuityId
      );

      // Add branch to start continuity
      if (startContinuity) {
        if (!startContinuity.branches) startContinuity.branches = [];
        startContinuity.branches.push(branch);
      }

      // Also add to end continuity if it's different (avoid duplicates)
      if (endContinuity && endContinuity.id !== startContinuity?.id) {
        if (!endContinuity.branches) endContinuity.branches = [];
        endContinuity.branches.push(branch);
      }

      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Update a branch's properties
   * @param branchId - The ID of the branch to update
   * @param updates - Partial branch updates
   */
  updateBranch(branchId: string, updates: Partial<Branch>): void {
    if (!this.state.currentProject) return;

    let changed = false;
    for (const continuity of this.state.currentProject.continuities) {
      if (!continuity.branches) continue;
      continuity.branches.forEach((branch) => {
        if (branch.id === branchId) {
          Object.assign(branch, updates);
          changed = true;
        }
      });
    }

    if (changed) {
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /** Persist a focused branch-text edit without rebuilding the application UI. */
  updateBranchSilently(branchId: string, updates: Partial<Branch>): void {
    if (!this.state.currentProject) return;

    let changed = false;
    for (const continuity of this.state.currentProject.continuities) {
      for (const branch of continuity.branches ?? []) {
        if (branch.id === branchId) {
          Object.assign(branch, updates);
          changed = true;
        }
      }
    }

    if (changed) {
      this.state.currentProject.modified = Date.now();
      this.persistProject();
    }
  }

  /**
   * Remove a branch from all continuities
   * @param branchId - The ID of the branch to remove
   */
  removeBranch(branchId: string): void {
    if (this.state.currentProject) {
      // Remove from all continuities
      for (const continuity of this.state.currentProject.continuities) {
        if (continuity.branches) {
          continuity.branches = continuity.branches.filter(b => b.id !== branchId);
        }
      }

      if (this.state.selectedBranchId === branchId) {
        this.state.selectedBranchId = null;
      }

      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Add a textbox to the project
   * @param textbox - The textbox to add
   */
  addTextbox(textbox: Textbox): void {
    if (this.state.currentProject) {
      if (!this.state.currentProject.textboxes) {
        this.state.currentProject.textboxes = [];
      }
      this.state.currentProject.textboxes.push(textbox);
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Update a textbox's properties
   * @param textboxId - The ID of the textbox to update
   * @param updates - Partial textbox updates
   */
  updateTextbox(textboxId: string, updates: Partial<Textbox>): void {
    if (this.state.currentProject && this.state.currentProject.textboxes) {
      const textbox = this.state.currentProject.textboxes.find(t => t.id === textboxId);
      if (textbox) {
        Object.assign(textbox, updates);
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /** Persist a focused text edit without rebuilding the application UI. */
  updateTextboxSilently(textboxId: string, updates: Partial<Textbox>): void {
    const textbox = this.state.currentProject?.textboxes?.find(t => t.id === textboxId);
    if (!textbox) return;

    Object.assign(textbox, updates);
    this.state.currentProject!.modified = Date.now();
    this.persistProject();
  }

  /**
   * Remove a textbox from the project
   * @param textboxId - The ID of the textbox to remove
   */
  removeTextbox(textboxId: string): void {
    if (this.state.currentProject && this.state.currentProject.textboxes) {
      this.state.currentProject.textboxes = this.state.currentProject.textboxes.filter(t => t.id !== textboxId);
      if (this.state.selectedTextboxId === textboxId) {
        this.state.selectedTextboxId = null;
      }
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Add a line to the project
   * @param line - The line to add
   */
  addLine(line: Line): void {
    if (this.state.currentProject) {
      if (!this.state.currentProject.lines) {
        this.state.currentProject.lines = [];
      }
      this.state.currentProject.lines.push(line);
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Update a line's properties
   * @param lineId - The ID of the line to update
   * @param updates - Partial line updates
   */
  updateLine(lineId: string, updates: Partial<Line>): void {
    if (this.state.currentProject && this.state.currentProject.lines) {
      const line = this.state.currentProject.lines.find(l => l.id === lineId);
      if (line) {
        Object.assign(line, updates);
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
  }

  /**
   * Update a line silently (updates state/localStorage but doesn't trigger UI listeners)
   * Useful for real-time updates that shouldn't cause sidebar re-renders
   */
  updateLineSilently(lineId: string, updates: Partial<Line>): void {
    if (this.state.currentProject && this.state.currentProject.lines) {
      const line = this.state.currentProject.lines.find(l => l.id === lineId);
      if (line) {
        Object.assign(line, updates);
        this.state.currentProject.modified = Date.now();
        // Save to localStorage but skip UI listener notifications to prevent sidebar re-renders
        LocalStorageManager.saveProject(this.state.currentProject);
      }
    }
  }

  /**
   * Remove a line from the project
   * @param lineId - The ID of the line to remove
   */
  removeLine(lineId: string): void {
    if (this.state.currentProject && this.state.currentProject.lines) {
      this.state.currentProject.lines = this.state.currentProject.lines.filter(l => l.id !== lineId);
      if (this.state.selectedLineId === lineId) {
        this.state.selectedLineId = null;
      }
      this.state.currentProject.modified = Date.now();
      this.notifyListeners();
    }
  }

  /** Remove a mixed canvas selection as one undoable operation. */
  deleteCanvasSelection(selection: CanvasDeletion): void {
    const project = this.state.currentProject;
    if (!project) return;
    if (!this.applyCanvasDeletion(project, selection)) return;
    project.modified = Date.now();
    this.notifyListeners();
  }

  private applyCanvasDeletion(project: Project, selection: CanvasDeletion): boolean {
    const timelineIds = new Set(selection.timelineIds);
    const chapterIds = new Set(selection.chapterIds);
    const branchIds = new Set(selection.branchIds);
    const textboxIds = new Set(selection.textboxIds);
    const lineIds = new Set(selection.lineIds);
    if (!timelineIds.size && !chapterIds.size && !branchIds.size && !textboxIds.size && !lineIds.size) return false;

    project.continuities = project.continuities.filter(continuity => !timelineIds.has(continuity.id));
    for (const continuity of project.continuities) {
      for (const chapterId of chapterIds) {
        if (continuity.chapters.some(chapter => chapter.id === chapterId)) this.updateBranchReferencesAfterChapterDeletion(continuity, chapterId);
      }
      continuity.chapters = continuity.chapters.filter(chapter => !chapterIds.has(chapter.id));
      continuity.branches = (continuity.branches || []).filter(branch =>
        !branchIds.has(branch.id)
        && !timelineIds.has(branch.startContinuityId)
        && !timelineIds.has(branch.endContinuityId));
      this.recalculateBranchPositions(continuity);
    }
    project.textboxes = (project.textboxes || []).filter(textbox => !textboxIds.has(textbox.id));
    project.lines = (project.lines || []).filter(line => !lineIds.has(line.id));
    if (this.state.selectedChapterId && chapterIds.has(this.state.selectedChapterId)) this.state.selectedChapterId = null;
    if (this.state.selectedBranchId && branchIds.has(this.state.selectedBranchId)) this.state.selectedBranchId = null;
    if (this.state.selectedTextboxId && textboxIds.has(this.state.selectedTextboxId)) this.state.selectedTextboxId = null;
    if (this.state.selectedLineId && lineIds.has(this.state.selectedLineId)) this.state.selectedLineId = null;
    if (this.state.selectedContinuityId && timelineIds.has(this.state.selectedContinuityId)) this.state.selectedContinuityId = null;
    return true;
  }

  /** Add pasted floating elements as one undoable operation. */
  addCanvasElements(elements: CanvasElements): void {
    const project = this.state.currentProject;
    if (!project || (!elements.textboxes.length && !elements.lines.length)) return;
    project.textboxes = [...(project.textboxes || []), ...elements.textboxes];
    project.lines = [...(project.lines || []), ...elements.lines];
    project.modified = Date.now();
    this.notifyListeners();
  }

  updateCanvasLines(lines: CanvasLinePosition[]): void {
    const project = this.state.currentProject;
    if (!project || !lines.length) return;
    const updates = new Map(lines.map(line => [line.id, line]));
    let changed = false;
    for (const line of project.lines || []) {
      const update = updates.get(line.id);
      if (!update) continue;
      Object.assign(line, update);
      changed = true;
    }
    if (!changed) return;
    project.modified = Date.now();
    this.notifyListeners();
  }

  updateCanvasTimelines(timelines: CanvasTimelinePosition[]): void {
    const project = this.state.currentProject;
    if (!project || !timelines.length) return;
    const updates = new Map(timelines.map(timeline => [timeline.id, timeline]));
    let changed = false;
    for (const continuity of project.continuities) {
      const update = updates.get(continuity.id);
      if (!update) continue;
      continuity.x = update.x;
      continuity.y = update.y;
      changed = true;
    }
    if (!changed) return;
    project.modified = Date.now();
    this.notifyListeners();
  }

  moveCanvasSelection(textboxes: CanvasTextboxPosition[], lines: CanvasLinePosition[], timelines: CanvasTimelinePosition[]): void {
    const project = this.state.currentProject;
    if (!project) return;
    const textboxUpdates = new Map(textboxes.map(item => [item.id, item]));
    const lineUpdates = new Map(lines.map(item => [item.id, item]));
    const timelineUpdates = new Map(timelines.map(item => [item.id, item]));
    let changed = false;
    for (const textbox of project.textboxes || []) { const update = textboxUpdates.get(textbox.id); if (update) { textbox.x = update.x; textbox.y = update.y; changed = true; } }
    for (const line of project.lines || []) { const update = lineUpdates.get(line.id); if (update) { Object.assign(line, update); changed = true; } }
    for (const continuity of project.continuities) { const update = timelineUpdates.get(continuity.id); if (update) { continuity.x = update.x; continuity.y = update.y; changed = true; } }
    if (!changed) return;
    project.modified = Date.now();
    this.notifyListeners();
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(recordHistory: boolean = true): void {
    if (recordHistory && this.state.currentProject) {
      const current = this.cloneProject(this.state.currentProject);
      if (this.lastProjectSnapshot && JSON.stringify(current) !== JSON.stringify(this.lastProjectSnapshot)) {
        this.undoStack.push(this.lastProjectSnapshot);
        if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
        this.redoStack = [];
      }
      this.lastProjectSnapshot = current;
    }
    this.persistProject();
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private cloneProject(project: Project): Project {
    return JSON.parse(JSON.stringify(project)) as Project;
  }

  private persistProject(): void {
    if (this.state.currentProject) {
      LocalStorageManager.saveProject(this.state.currentProject);
    }
  }
}
