import { createProject, createContinuity } from './types';
import { ContinuityFileManager, LocalStorageManager } from './fileManager';
import { AppStateManager } from './state';
import { UIComponents } from './ui';

/**
 * Main application entry point
 */

const stateManager = new AppStateManager();

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

  function renderUI() {
    mainWrapper.innerHTML = '';

    const state = stateManager.getState();
    const { currentProject, selectedContinuityId, selectedChapterId } = state;

    // Add header
    mainWrapper.appendChild(
      UIComponents.createHeader(
        currentProject,
        handleNewProject,
        handleExport,
        handleImport
      )
    );

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.style.display = 'flex';
    contentWrapper.style.flex = '1';
    contentWrapper.style.overflow = 'hidden';

    // Add sidebar
    contentWrapper.appendChild(
      UIComponents.createSidebar(
        currentProject,
        selectedContinuityId,
        stateManager.selectContinuity.bind(stateManager),
        handleAddContinuity
      )
    );

    // Add main content
    const selectedContinuity = currentProject?.continuities.find(
      c => c.id === selectedContinuityId
    );
    contentWrapper.appendChild(
      UIComponents.createMainContent(
        selectedContinuity || null,
        selectedChapterId,
        stateManager
      )
    );

    mainWrapper.appendChild(contentWrapper);
  }

  function handleNewProject() {
    const title = prompt('Project title:');
    if (title) {
      const project = createProject(title);
      stateManager.setProject(project);
      renderUI();
    }
  }

  function handleAddContinuity() {
    const name = prompt('Continuity name:');
    if (name) {
      const continuity = createContinuity(name);
      stateManager.addContinuity(continuity);
      stateManager.selectContinuity(continuity.id);
      renderUI();
    }
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

  // Try to load a project from local storage
  const projectIds = LocalStorageManager.listProjects();
  if (projectIds.length > 0) {
    const firstProjectId = projectIds[0].replace('continuity_', '');
    const project = LocalStorageManager.loadProject(firstProjectId);
    if (project) {
      stateManager.setProject(project);
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
