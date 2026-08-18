/**
 * UI component builders for the application
 */

import { Project, Continuity, createArc, createChapter, Arc } from './types';
import { AppStateManager } from './state';
import { createAppStyles } from './appStyles';
import { createEditSidebar, SidebarData, SidebarType } from './editSidebar';

export class UIComponents {
  static createHeader(project: Project | null, onNewProject: () => void, onExport: () => void, onImport: (file: File) => void, onExportPNG: () => void = () => {}, onShowAppInfo: (() => void) | null = null, onShowChangelog: (() => void) | null = null, onShowSettings: (() => void) | null = null): HTMLElement {
    const header = document.createElement('header');
    header.className = 'topbar';
    header.innerHTML = `
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-copy">
            <span class="brand-title">
              <img class="brand-logo" src="/assets/icons/continuity-logo.svg" alt="Continuity">
            </span>
            <span class="brand-subtitle">Story Planner & Timeline Manager</span>
          </div>
          <button id="info-btn" class="icon-btn" title="App information" style="width: 32px; height: 32px; padding: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; margin-left: 0.5rem;">
            <img src="/assets/icons/info-circle.svg" alt="Info" style="width: 20px; height: 20px;">
          </button>
          <button id="changelog-btn" class="icon-btn" title="View changelog" style="width: 32px; height: 32px; padding: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer;">
            <img src="/assets/icons/changelog.svg" alt="Changelog" style="width: 20px; height: 20px;">
          </button>
          ${project ? `
            <button id="settings-btn" class="icon-btn" title="Project settings" style="width: 32px; height: 32px; padding: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer;">
              <img src="/assets/icons/settings.svg" alt="Settings" style="width: 20px; height: 20px;">
            </button>
          ` : ''}
        </div>
        <div class="topbar-actions" role="group" aria-label="Project actions">
          <button id="new-project-btn" class="btn btn-primary-gradient" title="Start a new project">New Project</button>
          ${project ? `
            <button id="import-btn" class="btn btn-ghost" title="Import a .cty file">Import</button>
            <div class="export-menu">
              <button id="export-menu-btn" class="btn btn-ghost" title="Export project" aria-haspopup="true" aria-expanded="false">
                Export ▾
              </button>
              <div class="export-menu-list" role="menu">
                <button class="export-option" data-type="png" role="menuitem">PNG image</button>
                <button class="export-option" data-type="cty" role="menuitem">.cty project</button>
              </div>
            </div>
          ` : ''}
        </div>
        <button id="hamburger-menu-btn" class="hamburger-menu-btn" title="Menu" aria-haspopup="true" aria-expanded="false" aria-label="Toggle menu">
          <span class="hamburger-icon"></span>
          <span class="hamburger-icon"></span>
          <span class="hamburger-icon"></span>
        </button>
        <div class="hamburger-menu" id="hamburger-menu" role="menu">
          <button id="hamburger-info-btn" class="hamburger-menu-item" role="menuitem">App Info</button>
          <button id="hamburger-changelog-btn" class="hamburger-menu-item" role="menuitem">Changelog</button>
          ${project ? `
            <button id="hamburger-settings-btn" class="hamburger-menu-item" role="menuitem">Project Settings</button>
          ` : ''}
          <button id="hamburger-new-project-btn" class="hamburger-menu-item" role="menuitem">New Project</button>
          ${project ? `
            <button id="hamburger-import-btn" class="hamburger-menu-item" role="menuitem">Import</button>
            <button id="hamburger-export-png-btn" class="hamburger-menu-item" role="menuitem">Export as PNG</button>
            <button id="hamburger-export-cty-btn" class="hamburger-menu-item" role="menuitem">Export as .cty</button>
          ` : ''}
        </div>
      </div>
    `;

    // Wire up info button (large screens)
    if (onShowAppInfo) {
      header.querySelector('#info-btn')?.addEventListener('click', onShowAppInfo);
    }

    // Wire up changelog button (large screens)
    if (onShowChangelog) {
      header.querySelector('#changelog-btn')?.addEventListener('click', onShowChangelog);
    }

    // Wire up settings button (large screens)
    if (onShowSettings) {
      header.querySelector('#settings-btn')?.addEventListener('click', onShowSettings);
    }

    // Hamburger menu setup (before other buttons so closeHamburgerMenu is available)
    const hamburgerMenuBtn = header.querySelector('#hamburger-menu-btn') as HTMLButtonElement | null;
    const hamburgerMenu = header.querySelector('#hamburger-menu') as HTMLElement | null;

    let hamburgerDocClickHandler: ((e: MouseEvent) => void) | null = null;
    let hamburgerKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

    const closeHamburgerMenu = () => {
      if (!hamburgerMenu || !hamburgerMenuBtn) return;
      hamburgerMenu.classList.remove('open');
      hamburgerMenuBtn.setAttribute('aria-expanded', 'false');
      if (hamburgerDocClickHandler) {
        document.removeEventListener('click', hamburgerDocClickHandler);
        hamburgerDocClickHandler = null;
      }
      if (hamburgerKeydownHandler) {
        document.removeEventListener('keydown', hamburgerKeydownHandler);
        hamburgerKeydownHandler = null;
      }
    };

    const openHamburgerMenu = () => {
      if (!hamburgerMenu || !hamburgerMenuBtn) return;
      hamburgerMenu.classList.add('open');
      hamburgerMenuBtn.setAttribute('aria-expanded', 'true');
      hamburgerDocClickHandler = (e: MouseEvent) => {
        if (hamburgerMenu && !hamburgerMenu.contains(e.target as Node) && e.target !== hamburgerMenuBtn) {
          closeHamburgerMenu();
        }
      };
      hamburgerKeydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeHamburgerMenu();
        }
      };
      document.addEventListener('click', hamburgerDocClickHandler);
      document.addEventListener('keydown', hamburgerKeydownHandler);
    };

    const toggleHamburgerMenu = () => {
      if (!hamburgerMenu) return;
      if (hamburgerMenu.classList.contains('open')) {
        closeHamburgerMenu();
      } else {
        openHamburgerMenu();
      }
    };

    hamburgerMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHamburgerMenu();
    });

    // Wire up hamburger info button
    if (onShowAppInfo) {
      header.querySelector('#hamburger-info-btn')?.addEventListener('click', () => {
        closeHamburgerMenu();
        onShowAppInfo();
      });
    }

    // Wire up hamburger changelog button
    if (onShowChangelog) {
      header.querySelector('#hamburger-changelog-btn')?.addEventListener('click', () => {
        closeHamburgerMenu();
        onShowChangelog();
      });
    }

    // Wire up hamburger settings button
    if (onShowSettings) {
      header.querySelector('#hamburger-settings-btn')?.addEventListener('click', () => {
        closeHamburgerMenu();
        onShowSettings();
      });
    }

    header.querySelector('#new-project-btn')?.addEventListener('click', onNewProject);

    const exportMenu = header.querySelector('.export-menu') as HTMLElement | null;
    const exportMenuBtn = header.querySelector('#export-menu-btn') as HTMLButtonElement | null;
    const exportMenuList = header.querySelector('.export-menu-list') as HTMLElement | null;

    let docClickHandler: ((e: MouseEvent) => void) | null = null;
    let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    const closeMenu = () => {
      if (!exportMenu) return;
      exportMenu.classList.remove('open');
      exportMenuBtn?.setAttribute('aria-expanded', 'false');
      if (docClickHandler) {
        document.removeEventListener('click', docClickHandler);
        docClickHandler = null;
      }
      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
      }
    };

    const openMenu = () => {
      if (!exportMenu) return;
      exportMenu.classList.add('open');
      exportMenuBtn?.setAttribute('aria-expanded', 'true');
      docClickHandler = (e: MouseEvent) => {
        if (exportMenu && !exportMenu.contains(e.target as Node)) {
          closeMenu();
        }
      };
      keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeMenu();
        }
      };
      document.addEventListener('click', docClickHandler);
      document.addEventListener('keydown', keydownHandler);
    };

    const toggleMenu = () => {
      if (!exportMenu) return;
      if (exportMenu.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    exportMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    exportMenuList?.querySelectorAll('.export-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).getAttribute('data-type');
        closeMenu();
        if (type === 'png') {
          onExportPNG();
        } else {
          onExport();
        }
      });
    });
    
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

    // Wire hamburger menu items
    const hamburgerNewProjectBtn = header.querySelector('#hamburger-new-project-btn') as HTMLButtonElement | null;
    if (hamburgerNewProjectBtn) {
      hamburgerNewProjectBtn.addEventListener('click', () => {
        closeHamburgerMenu();
        onNewProject();
      });
    }

    const hamburgerImportBtn = header.querySelector('#hamburger-import-btn') as HTMLButtonElement | null;
    if (hamburgerImportBtn) {
      hamburgerImportBtn.addEventListener('click', () => {
        closeHamburgerMenu();
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

    const hamburgerExportPngBtn = header.querySelector('#hamburger-export-png-btn') as HTMLButtonElement | null;
    if (hamburgerExportPngBtn) {
      hamburgerExportPngBtn.addEventListener('click', () => {
        closeHamburgerMenu();
        onExportPNG();
      });
    }

    const hamburgerExportCtyBtn = header.querySelector('#hamburger-export-cty-btn') as HTMLButtonElement | null;
    if (hamburgerExportCtyBtn) {
      hamburgerExportCtyBtn.addEventListener('click', () => {
        closeHamburgerMenu();
        onExport();
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
      const newChapter = createChapter(
        `Chapter ${continuity.chapters.length + 1}`,
        undefined,
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
        <h1 class="welcome-title">
          <img class="welcome-logo" src="/assets/icons/continuity-logo.svg" alt="Continuity">
        </h1>
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

  static createExportChoiceModal(onExportPNG: () => void, onExportCTY: () => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay export-choice-modal';
    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="export-choice-title">
        <div class="modal-header">
          <h2 id="export-choice-title">Save project</h2>
        </div>
        <div class="modal-body">
          <p>Choose how you want to save your work.</p>
        </div>
        <div class="modal-actions export-choice-actions">
          <button type="button" data-export-choice="cancel" class="btn btn-secondary">Cancel</button>
          <button type="button" data-export-choice="png" class="btn btn-primary">PNG image</button>
          <button type="button" data-export-choice="cty" class="btn btn-primary">.cty project</button>
        </div>
      </div>
    `;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    const closeModal = () => {
      document.removeEventListener('keydown', handleEscape);
      modal.remove();
    };
    modal.querySelector('[data-export-choice="cancel"]')?.addEventListener('click', closeModal);
    modal.querySelector('[data-export-choice="png"]')?.addEventListener('click', () => {
      closeModal();
      onExportPNG();
    });
    modal.querySelector('[data-export-choice="cty"]')?.addEventListener('click', () => {
      closeModal();
      onExportCTY();
    });
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', handleEscape);
    window.setTimeout(() => (modal.querySelector('[data-export-choice="png"]') as HTMLButtonElement | null)?.focus(), 0);
    return modal;
  }

  static createVersionWarningModal(message: string, onConfirm: () => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Project Version Mismatch</h2>
        </div>
        <div class="modal-body" style="text-align: center;">
          <div style="margin-bottom: 1rem;">
            <img src="/assets/icons/alert-triangle.svg" alt="Warning" style="width: 48px; height: 48px; margin: 0 auto 1rem; display: block;">
          </div>
          <p style="color: #ff6b6b; font-weight: 600; margin: 0 0 0.75rem 0; font-size: 1.1rem;">Warning</p>
          <p style="margin: 0 0 1rem 0;">${message}</p>
          <p style="font-size: 0.9rem; color: #666; margin: 0;">You can still continue to load the project, but some features may not work correctly. After opening, consider exporting the project again to update it to the current version.</p>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-cancel" class="btn btn-secondary">Cancel Import</button>
          <button type="button" id="modal-confirm" class="btn btn-primary">Continue Anyway</button>
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

  static createAppInfoModal(appInfo: { version: string; copyright?: string; license?: string; bugReportUrl?: string }): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>About Continuity</h2>
        </div>
        <div class="modal-body">
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.25rem 0;">Version</p>
              <p style="font-weight: 600; font-size: 1.1rem; margin: 0;">${appInfo.version}</p>
            </div>
            <div>
              <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.25rem 0;">License</p>
              <p style="margin: 0;">${appInfo.license || 'N/A'}</p>
            </div>
            <div>
              <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.25rem 0;">Copyright</p>
              <p style="margin: 0;">${appInfo.copyright || 'N/A'}</p>
            </div>
            <div>
              <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.25rem 0;">Support</p>
              <a href="${appInfo.bugReportUrl || '#'}" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: none; font-weight: 500; display: inline-block;">Submit a bug report →</a>
            </div>
            <div id="kofi-container" style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e0e0e0;">
              <a href="https://ko-fi.com/S6S51T8G4I" target="_blank" rel="noopener noreferrer">
                <img src="/assets/images/support_me_on_kofi_beige.png" alt="Support me on Ko-fi" style="height: 36px; border: none; cursor: pointer;">
              </a>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-close" class="btn btn-primary">Close</button>
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('#modal-close') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);

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

  /**
   * Convert simple markdown to HTML for changelog display
   */
  private static markdownToHtml(markdown: string): string {
    // Remove escaped characters (backslash before special chars)
    let html = markdown.replace(/\\([+\-*#\[\]()])/g, '$1');

    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convert markdown links [text](url) to HTML links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: none; font-weight: 500;">$1</a>');

    // Convert # headings to HTML (do this before bold/text processing)
    html = html.replace(/^### (.*?)$/gm, '<h4 style="font-size: 1rem; font-weight: 700; margin: 0.5rem 0 0.1rem 0;">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 style="font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0 -0.4rem 0;">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 0.1rem 0;">$1</h2>');

    // Convert bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700;">$1</strong>');

    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p style="margin: 0.5rem 0 0;">');
    html = html.replace(/\n/g, '<br>');

    // Convert bullet points
    html = html.replace(/^[\+\-\*] (.*?)(?=<br>|<\/p>)/gm, '<li style="margin-left: 1.5rem; margin-bottom: 0.25rem;">$1</li>');
    html = html.replace(/(<li[^>]*>.*?<\/li>)/s, '<ul style="list-style: disc; margin: 0.5rem 0; padding-left: 0;">$1</ul>');

    // Wrap in paragraphs with negative top margin to counteract heading spacing
    html = `<p style="margin: -0.3rem 0 0 0; padding: 0;">${html}</p>`;

    return html;
  }

  static createChangelogModal(changelogContent: string, versions: string[] = [], currentVersion?: string, onVersionChange?: (version: string) => Promise<string>): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const htmlContent = this.markdownToHtml(changelogContent);

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px; max-height: 80vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <h2 style="margin: 0;">Changelog</h2>
          ${versions.length > 1 ? `<label style="margin-left: auto; font-size: 0.9rem;">Version <select id="changelog-version-select">${versions.map(version => `<option value="${version}" ${version === currentVersion ? 'selected' : ''}>${version}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 1rem;">
          <div style="font-size: 0.95rem; line-height: 1.6; color: #333;">
            ${htmlContent}
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-close" class="btn btn-primary">Close</button>
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('#modal-close') as HTMLButtonElement;
    const versionSelect = modal.querySelector('#changelog-version-select') as HTMLSelectElement | null;
    const content = modal.querySelector('.modal-body > div') as HTMLElement;
    versionSelect?.addEventListener('change', async () => {
      if (!onVersionChange) return;
      versionSelect.disabled = true;
      content.textContent = 'Loading changelog…';
      try {
        content.innerHTML = this.markdownToHtml(await onVersionChange(versionSelect.value));
      } finally {
        versionSelect.disabled = false;
      }
    });

    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);

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

  static createProjectSettingsModal(
    project: Project,
    onSave: (
      title: string,
      description: string,
      doubleTapSpeed: 'faster' | 'fast' | 'slow',
      rotationSnapping: boolean,
      textSize: 'small' | 'normal' | 'large',
    ) => void,
  ): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Project Settings</h2>
        </div>
        <form id="settings-form" class="modal-form" novalidate>
          <div class="form-group">
            <label for="project-title">Project Name</label>
            <input 
              type="text" 
              id="project-title" 
              name="project-title" 
              placeholder="Enter project name..." 
              value="${project.title}"
              autofocus
            />
            <span id="project-title-error" class="form-error" style="display: none; color: #ff6b6b; font-size: 0.85rem; margin-top: 0.25rem;"></span>
          </div>
          <div class="form-group">
            <label for="double-tap-speed">Double Tap Speed</label>
            <select id="double-tap-speed" name="double-tap-speed">
              <option value="faster" ${project.doubleTapSpeed === 'faster' ? 'selected' : ''}>Faster</option>
              <option value="fast" ${!project.doubleTapSpeed || project.doubleTapSpeed === 'fast' ? 'selected' : ''}>Fast</option>
              <option value="slow" ${project.doubleTapSpeed === 'slow' ? 'selected' : ''}>Slow</option>
            </select>
          </div>
          <div class="form-group">
            <label class="settings-toggle" for="rotation-snapping">
              <input type="checkbox" id="rotation-snapping" name="rotation-snapping" ${project.rotationSnapping !== false ? 'checked' : ''} />
              <span>Snap rotation to common angles</span>
            </label>
            <p class="form-help">Magnetizes near 0°, 30°, 45°, 60°, 90°, and their equivalents. Disable for unrestricted precision.</p>
          </div>
          <div class="form-group">
            <label for="project-description">Project Description</label>
            <textarea 
              id="project-description" 
              name="project-description" 
              placeholder="Enter project description..." 
              style="resize: vertical; min-height: 80px;"
            >${project.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label for="text-size">Text Size</label>
            <select id="text-size" name="text-size" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 100%; font-size: 0.95rem;">
              <option value="small" ${project.textSize === 'small' ? 'selected' : ''}>Small (80%)</option>
              <option value="normal" ${!project.textSize || project.textSize === 'normal' ? 'selected' : ''}>Normal (100%)</option>
              <option value="large" ${project.textSize === 'large' ? 'selected' : ''}>Large (125%)</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" id="modal-cancel" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector('#settings-form') as HTMLFormElement;
    const titleInput = modal.querySelector('#project-title') as HTMLInputElement;
    const descInput = modal.querySelector('#project-description') as HTMLTextAreaElement;
    const doubleTapInput = modal.querySelector('#double-tap-speed') as HTMLSelectElement;
    const rotationSnappingInput = modal.querySelector('#rotation-snapping') as HTMLInputElement;
    const textSizeSelect = modal.querySelector('#text-size') as HTMLSelectElement;
    const titleError = modal.querySelector('#project-title-error') as HTMLSpanElement;
    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();

      if (!title) {
        titleError.textContent = 'Project name is required';
        titleError.style.display = 'block';
        titleInput.focus();
        return;
      }

      titleError.style.display = 'none';
      const description = descInput.value.trim();
      const textSize = textSizeSelect.value as 'small' | 'normal' | 'large';
      closeModal();
      onSave(
        title,
        description,
        doubleTapInput.value as 'faster' | 'fast' | 'slow',
        rotationSnappingInput.checked,
        textSize,
      );
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
        <form id="project-form" class="modal-form" novalidate>
          <div class="form-group">
            <label for="project-name">Project Name</label>
            <input 
              type="text" 
              id="project-name" 
              name="project-name" 
              placeholder="Enter your project name..." 
              autofocus
            />
            <span id="project-name-error" class="form-error" style="display: none; color: #ff6b6b; font-size: 0.85rem; margin-top: 0.25rem;"></span>
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
    const errorSpan = modal.querySelector('#project-name-error') as HTMLSpanElement;
    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    const showError = () => {
      errorSpan.textContent = 'Please enter a project name';
      errorSpan.style.display = 'block';
      input.style.borderColor = '#ff6b6b';
    };

    const clearError = () => {
      errorSpan.style.display = 'none';
      input.style.borderColor = '';
    };

    input.addEventListener('input', clearError);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const projectName = input.value.trim();
      if (projectName) {
        closeModal();
        onSubmit(projectName);
      } else {
        showError();
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

  static createArcEditModal(arc: Arc, continuity: Continuity, stateManager: AppStateManager, onUpdate: () => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Edit Arc</h2>
        </div>
        <form id="arc-form" class="modal-form">
          <div class="form-group">
            <label for="arc-name">Arc Name</label>
            <input 
              type="text" 
              id="arc-name" 
              name="arc-name" 
              placeholder="Enter arc name..." 
              value="${arc.name}"
              required
              autofocus
            />
          </div>
          <div class="form-group">
            <label for="arc-color">Arc Color</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input 
                type="color" 
                id="arc-color-picker" 
                value="${arc.color}"
                style="width: 60px; height: 40px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"
              />
              <input 
                type="text" 
                id="arc-color-text" 
                name="arc-color" 
                placeholder="#000000 or rgb(0,0,0)" 
                value="${arc.color}"
                style="flex: 1;"
              />
            </div>
            <small style="display: block; margin-top: 4px; color: #666;">
              Enter a hex color (#RRGGBB) or RGB (rgb(r,g,b))
            </small>
          </div>
          <div class="modal-actions">
            <button type="button" id="modal-cancel" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector('#arc-form') as HTMLFormElement;
    const nameInput = modal.querySelector('#arc-name') as HTMLInputElement;
    const colorPicker = modal.querySelector('#arc-color-picker') as HTMLInputElement;
    const colorText = modal.querySelector('#arc-color-text') as HTMLInputElement;
    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;

    // Sync color picker and text input
    colorPicker.addEventListener('input', () => {
      colorText.value = colorPicker.value;
    });

    colorText.addEventListener('input', () => {
      let color = colorText.value.trim();
      // Try to parse and normalize the color
      if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
        colorPicker.value = color;
      } else if (color.startsWith('rgb')) {
        // Parse rgb(r, g, b) format
        const match = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          const hex = `#${r}${g}${b}`;
          colorPicker.value = hex;
        }
      }
    });

    const closeModal = () => {
      modal.remove();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const arcName = nameInput.value.trim();
      let arcColor = colorText.value.trim();
      
      // Validate and normalize color
      if (arcColor.startsWith('rgb')) {
        const match = arcColor.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          arcColor = `#${r}${g}${b}`;
        }
      }
      
      if (arcName && arcColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        stateManager.updateArc(continuity.id, arc.id, {
          name: arcName,
          color: arcColor
        });
        closeModal();
        onUpdate();
      } else {
        alert('Please enter a valid arc name and color (hex format #RRGGBB)');
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
    return createAppStyles();
  }

  static createEditSidebar(
    type: SidebarType,
    data: SidebarData,
    continuity: Continuity | null,
    stateManager: AppStateManager,
    onClose: () => void,
    autoFocus: boolean = false,
    refreshTextboxPreview?: () => void,
    refreshCanvasAfterFieldBlur?: () => void
  ): HTMLElement {
    return createEditSidebar(type, data, continuity, stateManager, onClose, autoFocus, {
      createConfirmModal: UIComponents.createConfirmModal,
      createArcEditModal: UIComponents.createArcEditModal,
      refreshTextboxPreview,
      refreshCanvasAfterFieldBlur,
    });
  }
}
