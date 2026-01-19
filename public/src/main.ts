import { createProject, createContinuity, createChapter, createBranch } from './types';
import { ContinuityFileManager, LocalStorageManager } from './fileManager';
import { AppStateManager } from './state';
import { UIComponents } from './ui';
import { TimelineCanvas } from './canvas';

/**
 * Main application entry point
 */

const stateManager = new AppStateManager();
let currentEditSidebar: HTMLElement | null = null;
let preservedSidebarState: { type: 'timeline' | 'chapter' | 'branch'; id: string } | null = null;

function initializeApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // Add styles
  document.head.appendChild(UIComponents.createStyles());

  // Create main layout
  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'main-wrapper';
  app.appendChild(mainWrapper);

  function closeSidebar() {
    if (currentEditSidebar) {
      currentEditSidebar.remove();
      currentEditSidebar = null;
    }
    preservedSidebarState = null;
  }

  function showTimelineEditSidebar(timelineId: string, autoFocus: boolean = false) {
    closeSidebar();
    
    const state = stateManager.getState();
    const appElement = app;
    if (!state.currentProject || !appElement) return;

    const continuity = state.currentProject.continuities.find(c => c.id === timelineId);
    if (!continuity) return;

    currentEditSidebar = UIComponents.createEditSidebar(
      'timeline',
      { id: timelineId, name: continuity.name },
      continuity,
      stateManager,
      closeSidebar,
      autoFocus
    );
    
    appElement.appendChild(currentEditSidebar);
    preservedSidebarState = { type: 'timeline', id: timelineId };
  }

  function showChapterEditSidebar(chapterId: string, autoFocus: boolean = false) {
    closeSidebar();
    
    const state = stateManager.getState();
    const appElement = app;
    if (!state.currentProject || !appElement) return;

    // Find the continuity and chapter
    let foundContinuity: any = null;
    let foundChapter: any = null;

    for (const continuity of state.currentProject.continuities) {
      const chapter = continuity.chapters.find(ch => ch.id === chapterId);
      if (chapter) {
        foundContinuity = continuity;
        foundChapter = chapter;
        break;
      }
    }

    if (!foundChapter || !foundContinuity) return;

    currentEditSidebar = UIComponents.createEditSidebar(
      'chapter',
      { id: chapterId, title: foundChapter.title, description: foundChapter.description, gridLength: foundChapter.gridLength, arcId: foundChapter.arcId },
      foundContinuity,
      stateManager,
      closeSidebar,
      autoFocus
    );
    
    appElement.appendChild(currentEditSidebar);
    preservedSidebarState = { type: 'chapter', id: chapterId };
  }

  function showBranchEditSidebar(branchId: string, autoFocus: boolean = false) {
    closeSidebar();
    
    const state = stateManager.getState();
    const appElement = app;
    if (!state.currentProject || !appElement) return;

    // Find the branch in any continuity
    let foundBranch: any = null;

    for (const continuity of state.currentProject.continuities) {
      if (!continuity.branches) continue; // Skip if no branches array
      const branch = continuity.branches.find(b => b.id === branchId);
      if (branch) {
        foundBranch = branch;
        break;
      }
    }

    if (!foundBranch) return;

    currentEditSidebar = UIComponents.createEditSidebar(
      'branch',
      { id: branchId, description: foundBranch.description, lineStyle: foundBranch.lineStyle },
      null, // Don't need continuity context for branches
      stateManager,
      closeSidebar,
      autoFocus
    );
    
    appElement.appendChild(currentEditSidebar);
    preservedSidebarState = { type: 'branch' as any, id: branchId };
  }

  let canvasInstance: TimelineCanvas | null = null;
  let lastViewport: { offsetX: number; offsetY: number; zoom: number } | null = null;

  function renderUI() {
    mainWrapper.innerHTML = '';
    // Capture viewport before tearing down UI
    if (canvasInstance) {
      lastViewport = canvasInstance.getViewport();
    }
    // Save sidebar state before closing
    const savedSidebarState = preservedSidebarState;
    closeSidebar();

    const state = stateManager.getState();
    const { currentProject } = state;

    // If no project, show welcome screen without header
    if (!currentProject) {
      mainWrapper.appendChild(
        UIComponents.createWelcomeScreen(
          handleNewProject,
          handleImport
        )
      );
      return;
    }

    // Add header (only shown when project is loaded)
    mainWrapper.appendChild(
      UIComponents.createHeader(
        currentProject,
        openNewProjectModal,
        handleExport,
        handleImport
      )
    );

    // Create canvas editor container
    const canvasContainer = UIComponents.createCanvasEditor();

    mainWrapper.appendChild(canvasContainer);

    // Initialize canvas editor
    const canvas = new TimelineCanvas(canvasContainer);
    canvasInstance = canvas;
    // Restore previous viewport to avoid any snapping
    if (lastViewport) {
      canvas.setViewport(lastViewport);
    }
    // Add existing continuities to canvas
    currentProject.continuities.forEach((continuity) => {
      canvas.addTimeline(continuity.id, continuity.name, continuity.x, continuity.y);
      // Sync chapters and arcs from state to canvas visualization
      canvas.updateTimelineChaptersWithArcs(continuity.id, continuity.chapters, continuity.arcs);
    });

    // Collect all branches from all continuities (avoiding duplicates)
    const allBranches = new Map();
    currentProject.continuities.forEach((continuity) => {
      if (continuity.branches) { // Handle old projects without branches array
        continuity.branches.forEach((branch) => {
          allBranches.set(branch.id, branch);
        });
      }
    });
    canvas.setBranches(Array.from(allBranches.values()));

    // Set arc mode state
    canvas.setArcMode(state.arcMode);

    // Setup canvas callbacks
    canvas.setOnAddTimeline(() => {
      handleAddContinuity();
    });

    canvas.setOnAddChapter((timelineId: string, position: number) => {
      handleAddChapter(timelineId, position);
    });

    canvas.setOnAddBranch((startTimelineId: string, startPosition: number, endTimelineId: string, endPosition: number) => {
      handleAddBranch(startTimelineId, startPosition, endTimelineId, endPosition);
    });

    canvas.setOnEditTimeline((timelineId: string) => {
      showTimelineEditSidebar(timelineId);
    });

    canvas.setOnEditChapter((chapterId: string) => {
      showChapterEditSidebar(chapterId);
    });

    canvas.setOnEditBranch((branchId: string) => {
      showBranchEditSidebar(branchId);
    });

    canvas.setOnTimelineHovered((timelineId: string | null, position: 'above' | 'below') => {
      // Visual feedback for hover states - can be expanded for more interactivity
    });

    canvas.setOnTimelineMoved((timelineId: string, x: number, y: number) => {
      // Save the new position to the state
      stateManager.updateContinuity(timelineId, { x, y });
    });

    canvas.setOnToggleArcMode(() => {
      stateManager.toggleArcMode();
    });

    canvas.setOnBackgroundClick(() => {
      closeSidebar();
    });

    canvas.setOnReorderChapter((timelineId: string, chapterId: string, targetIndex: number) => {
      // targetIndex is the position in the sorted chapter array (0-based)
      stateManager.reorderChapter(timelineId, chapterId, targetIndex);
    });

    canvas.setOnReorderArc((timelineId: string, arcId: string, targetIndex: number) => {
      // targetIndex is the position in the sorted arc array (0-based)
      stateManager.reorderArc(timelineId, arcId, targetIndex);
    });

    canvas.setGetStateChaptersCallback((timelineId: string) => {
      const state = stateManager.getState();
      if (!state.currentProject) return [];
      const continuity = state.currentProject.continuities.find(c => c.id === timelineId);
      return continuity?.chapters || [];
    });

    // Restore sidebar if it was open
    if (savedSidebarState) {
      if (savedSidebarState.type === 'timeline') {
        showTimelineEditSidebar(savedSidebarState.id);
      } else if (savedSidebarState.type === 'chapter') {
        showChapterEditSidebar(savedSidebarState.id);
      } else if (savedSidebarState.type === 'branch') {
        showBranchEditSidebar(savedSidebarState.id);
      }
    }
  }

  function openNewProjectModal() {
    const modal = UIComponents.createProjectModal(handleNewProject);
    document.body.appendChild(modal);
  }

  function handleNewProject(projectName: string) {
    const project = createProject(projectName);
    stateManager.setProject(project);
    // renderUI will be triggered by state subscription
  }

  function handleAddContinuity() {
    const state = stateManager.getState();
    if (!state.currentProject) return;
    
    const wasFirstTimeline = state.currentProject.continuities.length === 0;
    
    // Calculate position for new timeline: same x, 4 gridspaces below the lowest timeline
    let xPosition = 0;
    let yPosition = 0;
    if (state.currentProject.continuities.length > 0) {
      const lowestContinuity = state.currentProject.continuities.reduce((lowest, c) => {
        const lowestY = lowest.y !== undefined ? lowest.y : 0;
        const cY = c.y !== undefined ? c.y : 0;
        return cY > lowestY ? c : lowest;
      });
      xPosition = lowestContinuity.x !== undefined ? lowestContinuity.x : 0;
      const lowestY = lowestContinuity.y !== undefined ? lowestContinuity.y : 0;
      yPosition = lowestY + (4 * 50); // 4 gridspaces * 50 pixels per gridspace
    }
    
    // Create timeline with default name and calculated position
    const continuity = createContinuity(`Timeline ${state.currentProject.continuities.length + 1}`);
    continuity.x = xPosition;
    continuity.y = yPosition;
    
    stateManager.addContinuity(continuity);
    stateManager.selectContinuity(continuity.id);
    
    // Note: renderUI() is called synchronously via state subscription
    // After render completes, center on the new timeline if it's the first one
    if (wasFirstTimeline && canvasInstance) {
      // Call centerOnTimeline directly on the canvas instance after render
      canvasInstance.centerOnTimeline(continuity.id);
    }
    
    // Open the edit sidebar for the new timeline immediately with auto-focus
    showTimelineEditSidebar(continuity.id, true);
  }

  function handleAddChapter(timelineId: string, insertionIndex: number) {
    const state = stateManager.getState();
    if (!state.currentProject) return;

    const continuity = state.currentProject.continuities.find(c => c.id === timelineId);
    if (!continuity) return;

    // Create chapter with default name
    // The timestamp will be set by insertChapter based on position
    const chapter = createChapter(
      'Chapter',
      undefined,
      1 // Temporary timestamp, will be reassigned by insertChapter
    );
    stateManager.insertChapter(timelineId, chapter, insertionIndex);
    stateManager.selectChapter(chapter.id);

    // Open the edit sidebar for the new chapter immediately (after render) with auto-focus
    // We use setTimeout to allow renderUI to complete first
    setTimeout(() => {
      showChapterEditSidebar(chapter.id, true);
    }, 0);
  }

  function handleAddBranch(startTimelineId: string, startPosition: number, endTimelineId: string, endPosition: number) {
    const state = stateManager.getState();
    if (!state.currentProject) return;

    // Create branch
    const branch = createBranch(startTimelineId, startPosition, endTimelineId, endPosition);
    stateManager.addBranch(branch);
    stateManager.selectBranch(branch.id);

    // Open the edit sidebar for the new branch with auto-focus
    setTimeout(() => {
      showBranchEditSidebar(branch.id, true);
    }, 0);
  }

  function handleExport() {
    const state = stateManager.getState();
    if (state.currentProject) {
      ContinuityFileManager.exportProject(state.currentProject);
    }
  }

  async function handleImport(file: File) {
    try {
      const project = await ContinuityFileManager.importProject(file);
      stateManager.setProject(project);
      renderUI();
      // Center on the first timeline after import
      if (project.continuities.length > 0 && canvasInstance) {
        canvasInstance.centerOnTimeline(project.continuities[0].id);
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Subscribe to state changes
  stateManager.subscribe(() => {
    renderUI();
  });

  // Try to load a project from local storage (only if not in development mode)
  // To start fresh during development, set DISABLE_AUTO_LOAD to true or clear localStorage
  const isDevelopment = (import.meta as any).env?.DEV;
  if (!isDevelopment) {
    const projectIds = LocalStorageManager.listProjects();
    if (projectIds.length > 0) {
      const firstProjectId = projectIds[0].replace('continuity_', '');
      const project = LocalStorageManager.loadProject(firstProjectId);
      if (project) {
        stateManager.setProject(project);
      }
    }
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Skip if typing in an input field (except for Enter in edit sidebar)
    const target = e.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    
    // Shift + T: New Timeline
    if (e.shiftKey && e.key === 'T' && !isInInput) {
      e.preventDefault();
      const state = stateManager.getState();
      if (state.currentProject) {
        handleAddContinuity();
      }
    }
    
    // Shift + C: Toggle Chapter Insertion Mode
    if (e.shiftKey && e.key === 'C' && !isInInput) {
      e.preventDefault();
      const state = stateManager.getState();
      if (state.currentProject && canvasInstance) {
        canvasInstance.toggleInsertionMode();
      }
    }

    // Shift + A: Toggle Arc Mode
    if (e.shiftKey && e.key === 'A' && !isInInput) {
      e.preventDefault();
      const state = stateManager.getState();
      if (state.currentProject) {
        stateManager.toggleArcMode();
      }
    }

    // Shift + B: Toggle Branch Insertion Mode
    if (e.shiftKey && e.key === 'B' && !isInInput) {
      e.preventDefault();
      const state = stateManager.getState();
      if (state.currentProject && canvasInstance) {
        canvasInstance.toggleBranchInsertionMode();
      }
    }
  });

  // Initial render
  renderUI();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
