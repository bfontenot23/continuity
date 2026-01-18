/**
 * UI component builders for the application
 */

import { Project, Continuity, createArc, createChapter } from './types';
import { AppStateManager } from './state';

export class UIComponents {
  static createHeader(project: Project | null, onNewProject: () => void, onExport: () => void, onImport: (file: File) => void): HTMLElement {
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-content">
        <div class="header-title">
          <h1>Continuity</h1>
          <p>Story Planner & Timeline Manager</p>
        </div>
        <div class="header-actions">
          <button id="new-project-btn" class="btn btn-primary">New Project</button>
          ${project ? `
            <button id="export-btn" class="btn btn-secondary">Export</button>
            <button id="import-btn" class="btn btn-secondary">Import</button>
          ` : ''}
        </div>
      </div>
    `;

    header.querySelector('#new-project-btn')?.addEventListener('click', onNewProject);
    header.querySelector('#export-btn')?.addEventListener('click', onExport);
    
    const importBtn = header.querySelector('#import-btn') as HTMLButtonElement;
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cty,.json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            onImport(file);
          }
        };
        input.click();
      });
    }

    return header;
  }

  static createContinuityNav(project: Project | null, selectedContinuityId: string | null, onSelectContinuity: (id: string | null) => void, onAddContinuity: () => void): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'continuity-nav';

    if (!project || project.continuities.length === 0) {
      nav.innerHTML = '<div class="nav-empty">No continuities. Create one to get started!</div>';
      return nav;
    }

    const container = document.createElement('div');
    container.className = 'nav-container';

    const label = document.createElement('span');
    label.className = 'nav-label';
    label.textContent = 'Story Timelines:';
    container.appendChild(label);

    const items = document.createElement('div');
    items.className = 'nav-items';

    project.continuities.forEach(continuity => {
      const item = document.createElement('button');
      item.className = `nav-item ${selectedContinuityId === continuity.id ? 'active' : ''}`;
      item.innerHTML = `
        <span class="nav-item-color" style="background-color: ${continuity.color || '#999'}"></span>
        <span class="nav-item-name">${continuity.name}</span>
        <span class="nav-item-count">${continuity.chapters.length}</span>
      `;
      item.addEventListener('click', () => onSelectContinuity(continuity.id));
      items.appendChild(item);
    });

    container.appendChild(items);

    const addBtn = document.createElement('button');
    addBtn.className = 'nav-add-btn';
    addBtn.textContent = '+ Timeline';
    addBtn.addEventListener('click', onAddContinuity);
    container.appendChild(addBtn);

    nav.appendChild(container);
    return nav;
  }

  static createMainContent(continuity: Continuity | null, selectedChapterId: string | null, stateManager: AppStateManager): HTMLElement {
    const content = document.createElement('main');
    content.className = 'main-content';

    if (!continuity) {
      content.innerHTML = '<div class="content-empty">Select or create a continuity to begin</div>';
      return content;
    }

    const container = document.createElement('div');
    container.className = 'content-container';

    // Timeline view
    const timeline = UIComponents.createTimeline(continuity, selectedChapterId, stateManager);
    container.appendChild(timeline);

    // Editor panel
    const editor = UIComponents.createEditorPanel(continuity, selectedChapterId, stateManager);
    container.appendChild(editor);

    content.appendChild(container);
    return content;
  }

  static createTimeline(continuity: Continuity, selectedChapterId: string | null, stateManager: AppStateManager): HTMLElement {
    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.innerHTML = `
      <h2>${continuity.name}</h2>
      <button id="add-chapter-btn" class="btn btn-small">Add Chapter</button>
      <button id="add-arc-btn" class="btn btn-small">Add Arc</button>
    `;

    header.querySelector('#add-chapter-btn')?.addEventListener('click', () => {
      const arcId = continuity.arcs[0]?.id || 'default';
      const newChapter = createChapter(
        `Chapter ${continuity.chapters.length + 1}`,
        arcId,
        1 // Placeholder - addChapter will set correct timestamp
      );
      stateManager.addChapter(continuity.id, newChapter);
      stateManager.selectChapter(newChapter.id);
    });

    header.querySelector('#add-arc-btn')?.addEventListener('click', () => {
      const newArc = createArc(`Arc ${continuity.arcs.length + 1}`, continuity.arcs.length);
      stateManager.addArc(continuity.id, newArc);
    });

    timeline.appendChild(header);

    // Arcs and chapters
    const arcsContainer = document.createElement('div');
    arcsContainer.className = 'arcs-container';

    continuity.arcs.forEach(arc => {
      const arcSection = document.createElement('div');
      arcSection.className = 'arc-section';
      arcSection.innerHTML = `<h3 class="arc-title">${arc.name}</h3>`;

      const chaptersInArc = continuity.chapters
        .filter(ch => ch.arcId === arc.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      const chaptersGrid = document.createElement('div');
      chaptersGrid.className = 'chapters-grid';

      chaptersInArc.forEach(chapter => {
        const chapterItem = document.createElement('div');
        chapterItem.className = `chapter-item ${selectedChapterId === chapter.id ? 'selected' : ''}`;
        chapterItem.innerHTML = `
          <div class="chapter-number">${chapter.timestamp}</div>
          <div class="chapter-title">${chapter.title}</div>
        `;
        chapterItem.addEventListener('click', () => stateManager.selectChapter(chapter.id));
        chaptersGrid.appendChild(chapterItem);
      });

      arcSection.appendChild(chaptersGrid);
      arcsContainer.appendChild(arcSection);
    });

    timeline.appendChild(arcsContainer);
    return timeline;
  }

  static createEditorPanel(continuity: Continuity, selectedChapterId: string | null, stateManager: AppStateManager): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'editor-panel';

    if (!selectedChapterId) {
      panel.innerHTML = '<div class="editor-empty">Select a chapter to edit</div>';
      return panel;
    }

    const chapter = continuity.chapters.find(ch => ch.id === selectedChapterId);
    if (!chapter) {
      panel.innerHTML = '<div class="editor-empty">Chapter not found</div>';
      return panel;
    }

    panel.innerHTML = `
      <div class="editor-header">
        <h3>Edit Chapter</h3>
        <button id="delete-chapter-btn" class="btn btn-danger btn-small">Delete</button>
      </div>
      <form class="editor-form">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="chapter-title" value="${chapter.title}" />
        </div>
        <div class="form-group">
          <label>Timeline Position</label>
          <input type="number" id="chapter-timestamp" value="${chapter.timestamp}" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="chapter-description" placeholder="Chapter description...">${chapter.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Content</label>
          <textarea id="chapter-content" placeholder="Chapter content..." class="content-textarea">${chapter.content || ''}</textarea>
        </div>
      </form>
    `;

    const form = panel.querySelector('.editor-form') as HTMLFormElement;
    form.addEventListener('change', () => {
      const updates = {
        title: (document.getElementById('chapter-title') as HTMLInputElement).value,
        timestamp: parseInt((document.getElementById('chapter-timestamp') as HTMLInputElement).value),
        description: (document.getElementById('chapter-description') as HTMLTextAreaElement).value,
        content: (document.getElementById('chapter-content') as HTMLTextAreaElement).value,
      };
      stateManager.updateChapter(continuity.id, chapter.id, updates);
    });

    panel.querySelector('#delete-chapter-btn')?.addEventListener('click', () => {
      const confirmModal = UIComponents.createConfirmModal(
        'Delete chapter?',
        'Are you sure you want to delete this chapter? This action cannot be undone.',
        () => {
          stateManager.removeChapter(continuity.id, chapter.id);
        }
      );
      document.body.appendChild(confirmModal);
    });

    return panel;
  }



  static createWelcomeScreen(onNewProject: (projectName: string) => void, onImport: (file: File) => void): HTMLElement {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-screen';

    welcome.innerHTML = `
      <div class="welcome-container">
        <h1 class="welcome-title">Continuity</h1>
        <div class="welcome-actions">
          <button id="welcome-new-btn" class="btn btn-primary btn-large">
            Create New Project
          </button>
          <button id="welcome-import-btn" class="btn btn-secondary btn-large">
            Import Project
          </button>
        </div>
      </div>
    `;

    welcome.querySelector('#welcome-new-btn')?.addEventListener('click', () => {
      const modal = UIComponents.createProjectModal(onNewProject);
      document.body.appendChild(modal);
    });
    
    const importBtn = welcome.querySelector('#welcome-import-btn') as HTMLButtonElement;
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cty,.json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            onImport(file);
          }
        };
        input.click();
      });
    }

    return welcome;
  }

  static createConfirmModal(title: string, message: string, onConfirm: () => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-cancel" class="btn btn-secondary">Cancel</button>
          <button type="button" id="modal-confirm" class="btn btn-danger">Delete</button>
        </div>
      </div>
    `;

    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;
    const confirmBtn = modal.querySelector('#modal-confirm') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    confirmBtn.addEventListener('click', () => {
      closeModal();
      onConfirm();
    });

    cancelBtn.addEventListener('click', closeModal);

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    return modal;
  }

  static createProjectModal(onSubmit: (projectName: string) => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Project</h2>
        </div>
        <form id="project-form" class="modal-form">
          <div class="form-group">
            <label for="project-name">Project Name</label>
            <input 
              type="text" 
              id="project-name" 
              name="project-name" 
              placeholder="Enter your project name..." 
              required
              autofocus
            />
          </div>
          <div class="modal-actions">
            <button type="button" id="modal-cancel" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector('#project-form') as HTMLFormElement;
    const input = modal.querySelector('#project-name') as HTMLInputElement;
    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const projectName = input.value.trim();
      if (projectName) {
        closeModal();
        onSubmit(projectName);
      }
    });

    cancelBtn.addEventListener('click', closeModal);

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    });

    return modal;
  }

  static createCanvasEditor(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'canvas-editor-container';
    container.style.flex = '1';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    return container;
  }

  static createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f5f5f5;
        color: #333;
      }

      #app {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .header-content {
        max-width: 1600px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-title h1 {
        font-size: 1.8rem;
        margin-bottom: 0.25rem;
      }

      .header-title p {
        font-size: 0.9rem;
        opacity: 0.9;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: #fff;
        color: #667eea;
        font-weight: 600;
      }

      .btn-primary:hover {
        background: #f0f0f0;
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .btn-small {
        padding: 0.3rem 0.6rem;
        font-size: 0.8rem;
      }

      .btn-danger {
        background: #ff6b6b;
        color: white;
      }

      .btn-danger:hover {
        background: #ff5252;
      }

      .main-wrapper {
        display: flex;
        flex: 1;
        overflow: hidden;
        flex-direction: column;
      }

      .continuity-nav {
        background: white;
        border-bottom: 1px solid #e0e0e0;
        padding: 0.75rem 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .nav-empty {
        padding: 0.5rem 0;
        text-align: center;
        color: #999;
        font-size: 0.9rem;
      }

      .nav-container {
        max-width: 1600px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .nav-label {
        font-weight: 600;
        color: #555;
        white-space: nowrap;
        font-size: 0.95rem;
      }

      .nav-items {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        flex: 1;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        white-space: nowrap;
      }

      .nav-item:hover {
        background: #f0f0f0;
        border-color: #d0d0d0;
      }

      .nav-item.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      .nav-item-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }

      .nav-item-name {
        font-weight: 500;
      }

      .nav-item-count {
        font-size: 0.8rem;
        opacity: 0.7;
        margin-left: 0.25rem;
      }

      .nav-add-btn {
        padding: 0.5rem 1rem;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .nav-add-btn:hover {
        background: #5568d3;
      }

      .sidebar-empty,
      .content-empty,
      .editor-empty {
        padding: 2rem 1rem;
        text-align: center;
        color: #999;
      }

      .main-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .content-container {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        overflow: hidden;
        flex: 1;
      }

      .timeline {
        flex: 1;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow-y: auto;
        padding: 1.5rem;
      }

      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
      }

      .timeline-header h2 {
        font-size: 1.5rem;
      }

      .timeline-header button {
        margin-left: 0.5rem;
      }

      .arcs-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .arc-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .arc-title {
        font-size: 1rem;
        color: #667eea;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .chapters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
      }

      .chapter-item {
        background: #f9f9f9;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        padding: 1rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .chapter-item:hover {
        border-color: #667eea;
        background: #f0f0f0;
      }

      .chapter-item.selected {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      .chapter-number {
        font-weight: 600;
        font-size: 1.2rem;
        margin-bottom: 0.5rem;
      }

      .chapter-title {
        font-size: 0.85rem;
        word-wrap: break-word;
      }

      .editor-panel {
        width: 350px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow-y: auto;
        padding: 1.5rem;
      }

      .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
      }

      .editor-header h3 {
        font-size: 1.1rem;
      }

      .editor-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        font-size: 0.9rem;
        color: #555;
      }

      .form-group input,
      .form-group textarea {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9rem;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .content-textarea {
        min-height: 200px;
        resize: vertical;
      }

      .branch-view {
        flex: 1;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .branch-view-header {
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
      }

      .branch-view-header h2 {
        font-size: 1.5rem;
      }

      .branch-canvas {
        width: 100%;
        height: 400px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: white;
      }

      .welcome-screen {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
      }

      .welcome-container {
        max-width: 700px;
        text-align: center;
      }

      .welcome-title {
        font-size: 4rem;
        color: white;
        margin-bottom: 3rem;
        font-weight: 700;
        letter-spacing: 2px;
      }

      .welcome-actions {
        display: flex;
        gap: 1.5rem;
        flex-direction: column;
        align-items: center;
      }

      .btn-large {
        padding: 0.75rem 2.5rem !important;
        font-size: 1rem !important;
        min-width: 280px;
      }

      .edit-sidebar {
        position: fixed;
        right: 0;
        top: 0;
        bottom: 0;
        width: 350px;
        background: white;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
        overflow-y: auto;
        z-index: 1000;
        display: flex;
        flex-direction: column;
      }

      .edit-sidebar.hidden {
        display: none;
      }

      .edit-sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 2px solid #f0f0f0;
        flex-shrink: 0;
      }

      .edit-sidebar-header h3 {
        font-size: 1.1rem;
        margin: 0;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: #333;
      }

      .edit-sidebar-content {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
      }

      .edit-sidebar .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .edit-sidebar label {
        font-weight: 600;
        font-size: 0.9rem;
        color: #555;
      }

      .edit-sidebar input,
      .edit-sidebar textarea,
      .edit-sidebar select {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9rem;
      }

      .edit-sidebar input:focus,
      .edit-sidebar textarea:focus,
      .edit-sidebar select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .edit-sidebar textarea {
        min-height: 100px;
        resize: vertical;
      }

      .edit-sidebar-actions {
        display: flex;
        gap: 0.5rem;
        padding: 1.5rem;
        border-top: 2px solid #f0f0f0;
        flex-shrink: 0;
      }

      .edit-sidebar-actions button {
        flex: 1;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      }

      .edit-sidebar-actions .btn-primary {
        background: #667eea;
        color: white;
      }

      .edit-sidebar-actions .btn-primary:hover {
        background: #5568d3;
      }

      .edit-sidebar-actions .btn-danger {
        background: #ff6b6b;
        color: white;
      }

      .edit-sidebar-actions .btn-danger:hover {
        background: #ff5252;
      }

      @media (max-width: 1200px) {
        .content-container {
          flex-direction: column;
        }

        .editor-panel {
          width: 100%;
          min-height: 300px;
        }

        .chapters-grid {
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        }

        .nav-items {
          order: 2;
          flex-basis: 100%;
        }

        .nav-label {
          order: 1;
        }

        .nav-add-btn {
          order: 3;
          align-self: flex-start;
        }
      }

      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
        }

        .header-actions {
          width: 100%;
          justify-content: center;
        }
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 450px;
        width: 90%;
        overflow: hidden;
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e0e0e0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 600;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .modal-body p {
        margin: 0;
        color: #555;
        line-height: 1.6;
      }

      .modal-form {
        padding: 1.5rem;
      }

      .form-group {
        margin-bottom: 1.25rem;
      }

      .form-group:last-of-type {
        margin-bottom: 0;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #333;
        font-size: 0.95rem;
      }

      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 0.65rem 0.85rem;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.95rem;
        transition: border-color 0.2s ease;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding: 1.5rem;
        border-top: 1px solid #e0e0e0;
      }

      .modal-actions button {
        padding: 0.5rem 1.2rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .modal-actions .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .modal-actions .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .modal-actions .btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .modal-actions .btn-secondary:hover {
        background: #e0e0e0;
      }
    `;
    return style;
  }

  static createEditSidebar(
    type: 'timeline' | 'chapter',
    data: { id: string; name?: string; title?: string; description?: string; gridLength?: number },
    continuity: Continuity | null,
    stateManager: AppStateManager,
    onClose: () => void
  ): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'edit-sidebar';

    const header = document.createElement('div');
    header.className = 'edit-sidebar-header';
    
    const title = document.createElement('h3');
    title.textContent = type === 'timeline' ? 'Edit Timeline' : 'Edit Chapter';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', onClose);
    header.appendChild(closeBtn);

    sidebar.appendChild(header);

    const content = document.createElement('div');
    content.className = 'edit-sidebar-content';

    if (type === 'timeline') {
      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';
      
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Timeline Name';
      nameGroup.appendChild(nameLabel);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = data.name || '';
      nameInput.placeholder = 'Enter timeline name';
      nameInput.id = 'timeline-name-input';
      nameGroup.appendChild(nameInput);

      content.appendChild(nameGroup);
    } else {
      // Chapter editing
      const titleGroup = document.createElement('div');
      titleGroup.className = 'form-group';
      
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Chapter Title';
      titleGroup.appendChild(titleLabel);

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = data.title || '';
      titleInput.placeholder = 'Enter chapter title';
      titleInput.id = 'chapter-title-input';
      titleGroup.appendChild(titleInput);

      content.appendChild(titleGroup);

      const descGroup = document.createElement('div');
      descGroup.className = 'form-group';
      
      const descLabel = document.createElement('label');
      descLabel.textContent = 'Description';
      descGroup.appendChild(descLabel);

      const descTextarea = document.createElement('textarea');
      descTextarea.value = data.description || '';
      descTextarea.placeholder = 'Enter chapter description';
      descTextarea.id = 'chapter-desc-input';
      descGroup.appendChild(descTextarea);

      content.appendChild(descGroup);

      if (continuity) {
        const arcGroup = document.createElement('div');
        arcGroup.className = 'form-group';
        
        const arcLabel = document.createElement('label');
        arcLabel.textContent = 'Arc';
        arcGroup.appendChild(arcLabel);

        const arcSelect = document.createElement('select');
        arcSelect.id = 'chapter-arc-select';
        
        continuity.arcs.forEach(arc => {
          const option = document.createElement('option');
          option.value = arc.id;
          option.textContent = arc.name;
          arcSelect.appendChild(option);
        });

        arcGroup.appendChild(arcSelect);
        content.appendChild(arcGroup);

        // Grid Length input
        const gridLengthGroup = document.createElement('div');
        gridLengthGroup.className = 'form-group';
        
        const gridLengthLabel = document.createElement('label');
        gridLengthLabel.textContent = 'Grid Length';
        gridLengthGroup.appendChild(gridLengthLabel);

        const gridLengthInput = document.createElement('input');
        gridLengthInput.type = 'number';
        gridLengthInput.min = '0';
        gridLengthInput.step = '1';
        gridLengthInput.value = (data.gridLength || 0).toString();
        gridLengthInput.placeholder = '0 (auto)';
        gridLengthInput.id = 'chapter-gridlength-input';
        gridLengthInput.title = 'Set to 0 for automatic sizing based on title length';
        gridLengthGroup.appendChild(gridLengthInput);

        const gridLengthHint = document.createElement('small');
        gridLengthHint.style.display = 'block';
        gridLengthHint.style.marginTop = '4px';
        gridLengthHint.style.color = '#666';
        gridLengthHint.textContent = 'Set to 0 for automatic sizing';
        gridLengthGroup.appendChild(gridLengthHint);

        content.appendChild(gridLengthGroup);
      }
    }

    sidebar.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'edit-sidebar-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.textContent = 'Save';
    
    const handleSave = () => {
      if (type === 'timeline') {
        const nameInput = content.querySelector('#timeline-name-input') as HTMLInputElement;
        if (nameInput && continuity) {
          stateManager.updateContinuity(data.id, { name: nameInput.value });
        }
      } else {
        // Chapter saving
        if (continuity) {
          const titleInput = content.querySelector('#chapter-title-input') as HTMLInputElement;
          const descTextarea = content.querySelector('#chapter-desc-input') as HTMLTextAreaElement;
          const arcSelect = content.querySelector('#chapter-arc-select') as HTMLSelectElement;
          const gridLengthInput = content.querySelector('#chapter-gridlength-input') as HTMLInputElement;
          
          const updates: any = {};
          if (titleInput) updates.title = titleInput.value;
          if (descTextarea) updates.description = descTextarea.value;
          if (arcSelect) updates.arcId = arcSelect.value;
          if (gridLengthInput) {
            const gridLengthValue = parseInt(gridLengthInput.value, 10);
            updates.gridLength = isNaN(gridLengthValue) || gridLengthValue < 0 ? 0 : gridLengthValue;
          }
          
          stateManager.updateChapter(continuity.id, data.id, updates);
        }
      }
      onClose();
    };
    
    saveBtn.addEventListener('click', handleSave);
    
    // Add Enter key handler to sidebar for save
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only trigger on Enter if not in textarea (where Enter should add new line)
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleSave();
        }
      }
    };
    
    sidebar.addEventListener('keydown', handleKeyDown);

    actions.appendChild(saveBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      const confirmModal = UIComponents.createConfirmModal(
        `Delete ${type}?`,
        `Are you sure you want to delete this ${type}? This action cannot be undone.`,
        () => {
          if (type === 'timeline' && continuity) {
            stateManager.removeContinuity(data.id);
          } else if (type === 'chapter' && continuity) {
            stateManager.removeChapter(continuity.id, data.id);
          }
          onClose();
        }
      );
      document.body.appendChild(confirmModal);
    });

    actions.appendChild(deleteBtn);

    sidebar.appendChild(actions);

    // Auto-focus the appropriate input after sidebar is added to DOM
    setTimeout(() => {
      if (type === 'timeline') {
        const nameInput = sidebar.querySelector('#timeline-name-input') as HTMLInputElement;
        if (nameInput) nameInput.focus();
      } else {
        const titleInput = sidebar.querySelector('#chapter-title-input') as HTMLInputElement;
        if (titleInput) titleInput.focus();
      }
    }, 0);

    return sidebar;
  }
}
