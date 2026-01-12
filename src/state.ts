/**
 * Main application state management
 */

import { Project, Continuity, Chapter, Arc } from './types';
import { LocalStorageManager } from './fileManager';

type StateChangeListener = (state: AppState) => void;

export interface AppState {
  currentProject: Project | null;
  selectedContinuityId: string | null;
  selectedChapterId: string | null;
}

export class AppStateManager {
  private state: AppState;
  private listeners: Set<StateChangeListener> = new Set();

  constructor() {
    this.state = {
      currentProject: null,
      selectedContinuityId: null,
      selectedChapterId: null,
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
        continuity.chapters.push(chapter);
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
          this.state.currentProject.modified = Date.now();
          this.notifyListeners();
        }
      }
    }
  }

  removeChapter(continuityId: string, chapterId: string): void {
    if (this.state.currentProject) {
      const continuity = this.state.currentProject.continuities.find(c => c.id === continuityId);
      if (continuity) {
        continuity.chapters = continuity.chapters.filter(ch => ch.id !== chapterId);
        if (this.state.selectedChapterId === chapterId) {
          this.state.selectedChapterId = null;
        }
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

  updateProject(updates: Partial<Project>): void {
    if (this.state.currentProject) {
      Object.assign(this.state.currentProject, updates);
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
