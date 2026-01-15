import { createProject, createContinuity, createChapter } from './types';
import { ContinuityFileManager, LocalStorageManager } from './fileManager';
import { AppStateManager } from './state';
import { UIComponents } from './ui';
import { TimelineCanvas } from './canvas';

/**
 * Main application entry point
 */

const stateManager = new AppStateManager();
let currentEditSidebar: HTMLElement | null = null;

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
  }

  function showTimelineEditSidebar(timelineId: string) {
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
      closeSidebar
    );
    
    appElement.appendChild(currentEditSidebar);
  }

  let canvasInstance: TimelineCanvas | null = null;
  let lastViewport: { offsetX: number; offsetY: number; zoom: number } | null = null;

  function renderUI() {
    mainWrapper.innerHTML = '';
    // Capture viewport before tearing down UI
    if (canvasInstance) {
      lastViewport = canvasInstance.getViewport();
    }
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
    });

    // Setup canvas callbacks
    canvas.setOnAddTimeline(() => {
      handleAddContinuity();
    });

    canvas.setOnAddChapter((timelineId: string, position: number) => {
      handleAddChapter(timelineId, position);
    });

    canvas.setOnEditTimeline((timelineId: string) => {
      showTimelineEditSidebar(timelineId);
    });

    canvas.setOnTimelineHovered((_timelineId: string | null, _position: 'above' | 'below') => {
      // Visual feedback for hover states - can be expanded for more interactivity
    });

    canvas.setOnTimelineMoved((timelineId: string, x: number, y: number) => {
      // Save the new position to the state
      stateManager.updateContinuity(timelineId, { x, y });
    });
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
    
    // Open the edit sidebar for the new timeline immediately
    showTimelineEditSidebar(continuity.id);
  }

  function handleAddChapter(timelineId: string, position: number) {
    const state = stateManager.getState();
    if (!state.currentProject) return;

    const continuity = state.currentProject.continuities.find(c => c.id === timelineId);
    if (!continuity) return;

    // Create chapter with default name
    const arcId = continuity.arcs[0]?.id || 'default';
    const chapter = createChapter(
      'Chapter',
      arcId,
      position,
      continuity.chapters.length
    );
    stateManager.addChapter(timelineId, chapter);
    stateManager.selectChapter(chapter.id);

    // Note: renderUI() is called via state subscription
    // Chapter insertion should happen silently without opening menus
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

  // Initial render
  renderUI();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
