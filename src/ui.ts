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

  static createSidebar(project: Project | null, selectedContinuityId: string | null, onSelectContinuity: (id: string | null) => void, onAddContinuity: () => void): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    if (!project) {
      sidebar.innerHTML = '<div class="sidebar-empty">No project loaded</div>';
      return sidebar;
    }

    const list = document.createElement('div');
    list.className = 'continuity-list';

    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
      <h2>Continuities</h2>
      <button id="add-continuity-btn" class="btn btn-small">+</button>
    `;
    header.querySelector('#add-continuity-btn')?.addEventListener('click', onAddContinuity);
    list.appendChild(header);

    project.continuities.forEach(continuity => {
      const item = document.createElement('div');
      item.className = `continuity-item ${selectedContinuityId === continuity.id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="continuity-item-content">
          <div class="continuity-color" style="background-color: ${continuity.color || '#999'}"></div>
          <div class="continuity-info">
            <h3>${continuity.name}</h3>
            <p>${continuity.chapters.length} chapters</p>
          </div>
        </div>
      `;
      item.addEventListener('click', () => onSelectContinuity(continuity.id));
      list.appendChild(item);
    });

    sidebar.appendChild(list);
    return sidebar;
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
        continuity.chapters.length,
        continuity.chapters.length
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
      if (confirm('Delete this chapter?')) {
        stateManager.removeChapter(continuity.id, chapter.id);
      }
    });

    return panel;
  }

  static createBranchView(project: Project): HTMLElement {
    const branchView = document.createElement('div');
    branchView.className = 'branch-view';

    const header = document.createElement('div');
    header.className = 'branch-view-header';
    header.innerHTML = '<h2>Story Branches & Merges</h2>';
    branchView.appendChild(header);

    const canvas = document.createElement('canvas');
    canvas.className = 'branch-canvas';
    canvas.width = 800;
    canvas.height = 400;

    branchView.appendChild(canvas);

    // Draw the branch diagram
    const ctx = canvas.getContext('2d');
    if (ctx) {
      UIComponents.drawBranchDiagram(ctx, project);
    }

    return branchView;
  }

  private static drawBranchDiagram(ctx: CanvasRenderingContext2D, project: Project): void {
    const continuities = project.continuities;
    const padding = 40;
    const nodeWidth = 150;
    const nodeHeight = 60;
    const verticalGap = 100;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw continuity nodes
    continuities.forEach((continuity, index) => {
      const x = padding + index * (nodeWidth + 50);
      const y = padding + index * verticalGap;

      // Draw node
      ctx.fillStyle = continuity.color || '#999';
      ctx.fillRect(x, y, nodeWidth, nodeHeight);

      // Draw text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(continuity.name, x + nodeWidth / 2, y + nodeHeight / 2);

      // Draw connection lines to branched continuities
      continuity.branches.forEach(branch => {
        const targetIndex = continuities.findIndex(c => c.id === branch.toContinuityId);
        if (targetIndex !== -1) {
          const targetX = padding + targetIndex * (nodeWidth + 50);
          const targetY = padding + targetIndex * verticalGap;

          // Draw curved line
          ctx.strokeStyle = '#ccc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + nodeWidth, y + nodeHeight / 2);
          ctx.quadraticCurveTo(
            (x + targetX) / 2,
            (y + targetY) / 2 + 30,
            targetX,
            targetY + nodeHeight / 2
          );
          ctx.stroke();
        }
      });
    });
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
      }

      .sidebar {
        width: 280px;
        background: white;
        border-right: 1px solid #e0e0e0;
        overflow-y: auto;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
      }

      .sidebar-empty,
      .content-empty,
      .editor-empty {
        padding: 2rem 1rem;
        text-align: center;
        color: #999;
      }

      .continuity-list {
        padding: 1rem;
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .sidebar-header h2 {
        font-size: 1.1rem;
      }

      .continuity-item {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: #f9f9f9;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .continuity-item:hover {
        background: #f0f0f0;
      }

      .continuity-item.active {
        background: #e3f2fd;
        border-left: 3px solid #667eea;
      }

      .continuity-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .continuity-info h3 {
        font-size: 0.95rem;
        margin-bottom: 0.25rem;
      }

      .continuity-info p {
        font-size: 0.8rem;
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
      }

      @media (max-width: 768px) {
        .main-wrapper {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
          border-right: none;
          border-bottom: 1px solid #e0e0e0;
          max-height: 200px;
        }

        .header-content {
          flex-direction: column;
          gap: 1rem;
        }

        .header-actions {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    return style;
  }
}
