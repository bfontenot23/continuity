/**
 * Main application state management
 */

import { Project, Continuity, Chapter, Arc, Branch, Textbox, Line } from './types';
import { LocalStorageManager } from './fileManager';

type StateChangeListener = (state: AppState) => void;

export interface AppState {
  currentProject: Project | null;
  selectedContinuityId: string | null;
  selectedChapterId: string | null;
  selectedBranchId: string | null;
  selectedTextboxId: string | null;
  selectedLineId: string | null;
}

export class AppStateManager {
  private state: AppState;
  private listeners: Set<StateChangeListener> = new Set();

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
        this.state.currentProject.modified = Date.now();
        this.notifyListeners();
      }
    }
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

  updateChapter(continuityId: string, chapterId: string, updates: Partial<Chapter>): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        const chapter = continuity.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
          Object.assign(chapter, updates);
          // If gridLength or timestamp changed, recalculate branch positions on this timeline
          // timestamp changes mean chapter reordering, which affects branch positions
          if (('gridLength' in updates || 'timestamp' in updates) && continuity.branches) {
            this.recalculateBranchPositions(continuity);
          }
          this.state.currentProject.modified = Date.now();
          this.notifyListeners();
        }
      }
    }
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

    // Helper to calculate chapter positions
    const getChapterPositions = (chapters: Chapter[]) => {
      const positions = new Map<string, { x: number; width: number }>();
      let currentX = 1; // Start after Head (x=0, width=1)
      const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);
      
      sortedChapters.forEach((chapter) => {
        let chapterWidth: number;
        if (chapter.gridLength && chapter.gridLength > 0) {
          chapterWidth = chapter.gridLength;
        } else {
          chapterWidth = Math.max(1, Math.ceil(chapter.title.length / 5));
        }
        
        positions.set(chapter.id, { x: currentX, width: chapterWidth });
        currentX += chapterWidth;
      });
      
      return { positions, tailPosition: currentX };
    };

    // Get positions for this continuity
    const { positions } = getChapterPositions(continuity.chapters);

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

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    // Auto-save to local storage
    if (this.state.currentProject) {
      LocalStorageManager.saveProject(this.state.currentProject);
    }
    this.listeners.forEach(listener => listener(this.getState()));
  }
}
