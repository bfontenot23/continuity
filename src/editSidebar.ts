/** Dedicated builder for the edit-sidebar workflow. */
import { Arc, Continuity, createArc } from './types';
import { AppStateManager } from './state';

export type SidebarType = 'timeline' | 'chapter' | 'branch' | 'textbox' | 'line';
export interface SidebarData {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  gridLength?: number;
  headGridLength?: number;
  tailGridLength?: number;
  arcId?: string;
  lineStyle?: string;
  lineWidth?: number;
  startEndpointStyle?: 'dot' | 'arrow' | 'none';
  endEndpointStyle?: 'dot' | 'arrow' | 'none';
  startChapterId?: string;
  endChapterId?: string;
  startContinuityId?: string;
  endContinuityId?: string;
  content?: string;
  fontSize?: number;
  alignX?: 'left' | 'center' | 'right';
  alignY?: 'top' | 'middle' | 'bottom';
  shapeType?: 'square' | 'circle' | 'triangle';
}

export interface SidebarDependencies {
  createConfirmModal(title: string, message: string, onConfirm: () => void): HTMLElement;
  createArcEditModal(arc: Arc, continuity: Continuity, stateManager: AppStateManager, onUpdate: () => void): HTMLElement;
  refreshTextboxPreview?(): void;
  refreshCanvasAfterFieldBlur?(): void;
}

export function createEditSidebar(
  type: SidebarType,
  data: SidebarData,
  continuity: Continuity | null,
  stateManager: AppStateManager,
  onClose: () => void,
  autoFocus: boolean = false,
  dependencies: SidebarDependencies
): HTMLElement {
  const sidebar = document.createElement('div');
  sidebar.className = 'edit-sidebar';

  let pointerInteractionInsideSidebar = false;
  sidebar.addEventListener('pointerdown', () => {
    pointerInteractionInsideSidebar = true;
  });
  sidebar.addEventListener('pointerup', () => {
    // The blur notification is queued before pointerup, so it can still see
    // this flag and avoid rebuilding the sidebar during an internal click.
    window.setTimeout(() => {
      pointerInteractionInsideSidebar = false;
    }, 0);
  });

  // A blur occurs before the click that caused it. Delay UI notifications so a
  // click on another sidebar control can complete without replacing that control.
  const notifyAfterFieldBlur = (notify: () => void, refreshCanvas: boolean = false): void => {
    window.setTimeout(() => {
      if (refreshCanvas) dependencies.refreshCanvasAfterFieldBlur?.();
      if (!sidebar.isConnected || (!pointerInteractionInsideSidebar && !sidebar.contains(document.activeElement))) {
        notify();
      }
    }, 0);
  };

  const header = document.createElement('div');
  header.className = 'edit-sidebar-header';
  
  const title = document.createElement('h3');
  title.textContent = type === 'timeline' ? 'Edit Timeline' : type === 'chapter' ? 'Edit Chapter' : type === 'branch' ? 'Edit Branch' : type === 'textbox' ? 'Edit Textbox' : 'Edit Line';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', () => {
    onClose();
  });
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

    // Save while typing without recreating the focused sidebar.
    nameInput.addEventListener('input', () => {
      if (continuity) {
        stateManager.updateContinuitySilently(data.id, { name: nameInput.value });
      }
    });
    nameInput.addEventListener('blur', () => {
      if (continuity) {
        notifyAfterFieldBlur(() => stateManager.updateContinuity(data.id, { name: nameInput.value }), true);
      }
    });

    const addEndpointLengthInput = (label: string, id: string, value: number | undefined, field: 'headGridLength' | 'tailGridLength') => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const inputLabel = document.createElement('label');
      inputLabel.htmlFor = id;
      inputLabel.textContent = label;
      const input = document.createElement('input');
      input.id = id;
      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.value = String(Math.max(1, value ?? 1));
      input.title = 'Number of grid units reserved at this endpoint';
      input.addEventListener('change', () => {
        const next = Math.max(1, Number.parseInt(input.value, 10) || 1);
        input.value = String(next);
        stateManager.updateContinuity(data.id, { [field]: next });
      });
      group.append(inputLabel, input);
      content.appendChild(group);
    };
    addEndpointLengthInput('Head Grid Length', 'timeline-head-gridlength-input', data.headGridLength, 'headGridLength');
    addEndpointLengthInput('Tail Grid Length', 'timeline-tail-gridlength-input', data.tailGridLength, 'tailGridLength');

    // Arc Management Section
    if (continuity) {
      const arcSectionHeader = document.createElement('h4');
      arcSectionHeader.textContent = 'Arcs';
      arcSectionHeader.style.marginTop = '20px';
      arcSectionHeader.style.marginBottom = '10px';
      content.appendChild(arcSectionHeader);

      const arcsList = document.createElement('div');
      arcsList.className = 'arcs-list';
      arcsList.id = 'arcs-list';
      arcsList.style.minHeight = '50px'; // Ensure there's space to drop even when empty

      let draggedElement: HTMLElement | null = null;
      let placeholder: HTMLElement | null = null;

      // Handle dragging over the list container for top/bottom edge cases
      arcsList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedElement && placeholder && arcsList.children.length > 1) {
          const items = Array.from(arcsList.children).filter(child => 
            child.classList.contains('arc-item') && 
            child !== draggedElement
          ) as HTMLElement[];
          
          if (items.length > 0) {
            const mouseY = e.clientY;
            
            // Check if near the top of the list
            const firstItem = items[0];
            const firstItemRect = firstItem.getBoundingClientRect();
            
            if (mouseY < firstItemRect.top) {
              // Move placeholder to the very top
              if (arcsList.firstChild !== placeholder) {
                arcsList.insertBefore(placeholder, arcsList.firstChild);
              }
              return;
            }
            
            // Check if near the bottom of the list
            const lastItem = items[items.length - 1];
            const lastItemRect = lastItem.getBoundingClientRect();
            
            if (mouseY > lastItemRect.bottom) {
              // Move placeholder to the very bottom
              if (arcsList.lastChild !== placeholder) {
                arcsList.appendChild(placeholder);
              }
              return;
            }
          }
        }
      });

      const renderArcsList = () => {
        arcsList.innerHTML = '';
        
        if (continuity.arcs.length === 0) {
          const emptyMsg = document.createElement('p');
          emptyMsg.style.color = '#666';
          emptyMsg.style.fontSize = '14px';
          arcsList.appendChild(emptyMsg);
          emptyMsg.textContent = 'No arcs yet. Add one below.';
        } else {
          // Sort arcs by order property for consistent display
          const sortedArcs = [...continuity.arcs].sort((a, b) => a.order - b.order);
          
          sortedArcs.forEach((arc, index) => {
            const arcItem = document.createElement('div');
            arcItem.className = 'arc-item';
            arcItem.draggable = true;
            arcItem.dataset.arcId = arc.id;
            arcItem.dataset.arcIndex = String(index);
            arcItem.style.display = 'flex';
            arcItem.style.alignItems = 'center';
            arcItem.style.gap = '8px';
            arcItem.style.marginBottom = '8px';
            arcItem.style.padding = '8px';
            arcItem.style.borderRadius = '4px';
            arcItem.style.backgroundColor = '#f5f5f5';
            arcItem.style.cursor = 'grab';
            arcItem.style.transition = 'opacity 0.2s ease';
            arcItem.style.userSelect = 'none';

            const colorPreview = document.createElement('div');
            colorPreview.style.width = '24px';
            colorPreview.style.height = '24px';
            colorPreview.style.borderRadius = '4px';
            colorPreview.style.backgroundColor = arc.color;
            colorPreview.style.border = '1px solid #ccc';
            colorPreview.style.pointerEvents = 'none';
            arcItem.appendChild(colorPreview);

            const arcName = document.createElement('span');
            arcName.style.flex = '1';
            arcName.style.pointerEvents = 'none';
            arcName.textContent = arc.name;
            arcItem.appendChild(arcName);

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-small';
            editBtn.textContent = 'Edit';
            editBtn.style.padding = '4px 8px';
            editBtn.style.fontSize = '12px';
            editBtn.type = 'button';
            editBtn.addEventListener('click', () => {
              const modal = dependencies.createArcEditModal(arc, continuity, stateManager, () => {
                renderArcsList();
              });
              document.body.appendChild(modal);
            });
            arcItem.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-small';
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.padding = '4px 8px';
            deleteBtn.style.fontSize = '12px';
            deleteBtn.type = 'button';
            deleteBtn.addEventListener('click', () => {
              const confirmModal = dependencies.createConfirmModal(
                'Delete arc?',
                `Are you sure you want to delete "${arc.name}"? Chapters in this arc will be moved to the first remaining arc.`,
                () => {
                  stateManager.removeArc(continuity.id, arc.id);
                  renderArcsList();
                }
              );
              document.body.appendChild(confirmModal);
            });
            arcItem.appendChild(deleteBtn);

            // Drag and drop event handlers
            arcItem.addEventListener('dragstart', (e) => {
              draggedElement = arcItem;
              
              // Create placeholder
              placeholder = document.createElement('div');
              placeholder.className = 'arc-item-placeholder';
              placeholder.style.height = arcItem.offsetHeight + 'px';
              placeholder.style.marginBottom = '8px';
              placeholder.style.border = '2px dashed #667eea';
              placeholder.style.borderRadius = '4px';
              placeholder.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
              
              // Insert placeholder at original position and hide the dragged element
              setTimeout(() => {
                if (draggedElement && placeholder) {
                  draggedElement.parentNode?.insertBefore(placeholder, draggedElement);
                  draggedElement.style.display = 'none';
                }
              }, 0);
              
              e.dataTransfer!.effectAllowed = 'move';
              e.dataTransfer!.setData('text/plain', String(index));
            });

            arcItem.addEventListener('dragend', () => {
              if (draggedElement && placeholder) {
                // Calculate final position from placeholder location immediately
                const allChildren = Array.from(arcsList.children);
                const placeholderIndex = allChildren.indexOf(placeholder);
                
                // Count only actual arc items before the placeholder
                let toIndex = 0;
                for (let i = 0; i < placeholderIndex; i++) {
                  if (allChildren[i].classList.contains('arc-item')) {
                    toIndex++;
                  }
                }
                
                const fromIndex = parseInt(draggedElement.dataset.arcIndex || '0');
                
                // Remove placeholder immediately
                placeholder.parentNode?.removeChild(placeholder);
                placeholder = null;
                
                // Show the element again
                draggedElement.style.display = 'flex';
                draggedElement.style.opacity = '1';
                draggedElement.style.cursor = 'grab';
                
                draggedElement = null;
                
                // Perform state update if position changed
                if (fromIndex !== toIndex) {
                  stateManager.reorderArcs(continuity.id, fromIndex, toIndex);
                } else {
                  // Even if no change, we need to re-render to clean up
                  renderArcsList();
                }
              }
            });

            arcItem.addEventListener('dragover', (e) => {
              e.preventDefault();
              e.dataTransfer!.dropEffect = 'move';
              
              if (draggedElement && placeholder && draggedElement !== arcItem) {
                // Get all visible arc items (excluding the hidden dragged element and placeholder)
                const items = Array.from(arcsList.children).filter(child => 
                  child.classList.contains('arc-item') && 
                  child !== draggedElement &&
                  !child.classList.contains('arc-item-placeholder')
                ) as HTMLElement[];
                
                const targetIndex = items.indexOf(arcItem);
                
                if (targetIndex !== -1) {
                  // Determine if we're hovering over the top or bottom half of the target
                  const rect = arcItem.getBoundingClientRect();
                  const mouseY = e.clientY;
                  const itemMiddle = rect.top + rect.height / 2;
                  
                  // Get the current position of the placeholder in all children
                  const allChildren = Array.from(arcsList.children);
                  const placeholderCurrentIndex = allChildren.indexOf(placeholder);
                  const targetActualIndex = allChildren.indexOf(arcItem);
                  
                  if (mouseY < itemMiddle) {
                    // Insert before this item
                    if (placeholderCurrentIndex !== targetActualIndex) {
                      arcItem.parentNode?.insertBefore(placeholder, arcItem);
                    }
                  } else {
                    // Insert after this item
                    const nextSiblingIndex = targetActualIndex + 1;
                    if (placeholderCurrentIndex !== nextSiblingIndex) {
                      arcItem.parentNode?.insertBefore(placeholder, arcItem.nextSibling);
                    }
                  }
                }
              }
            });

            arcItem.addEventListener('drop', (e) => {
              e.preventDefault();
              e.stopPropagation();
            });

            arcsList.appendChild(arcItem);
          });
        }
      };

      renderArcsList();
      content.appendChild(arcsList);

      const addArcBtn = document.createElement('button');
      addArcBtn.textContent = 'Add Arc';
      addArcBtn.type = 'button';
      addArcBtn.style.marginTop = '10px';
      addArcBtn.style.width = '100%';
      addArcBtn.style.padding = '0.5rem 1rem';
      addArcBtn.style.border = 'none';
      addArcBtn.style.borderRadius = '6px';
      addArcBtn.style.background = '#667eea';
      addArcBtn.style.color = 'white';
      addArcBtn.style.cursor = 'pointer';
      addArcBtn.style.fontWeight = '600';
      addArcBtn.style.fontSize = '0.9rem';
      addArcBtn.addEventListener('mouseover', () => {
        addArcBtn.style.background = '#5568d3';
      });
      addArcBtn.addEventListener('mouseout', () => {
        addArcBtn.style.background = '#667eea';
      });
      addArcBtn.addEventListener('click', () => {
        const newArc = createArc(`Arc ${continuity.arcs.length + 1}`, continuity.arcs.length);
        stateManager.addArc(continuity.id, newArc);
        renderArcsList();
      });
      content.appendChild(addArcBtn);
    }
  } else if (type === 'chapter') {
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

    // Save while typing without recreating the focused sidebar.
    titleInput.addEventListener('input', () => {
      if (continuity) {
        stateManager.updateChapterSilently(continuity.id, data.id, { title: titleInput.value });
      }
    });
    titleInput.addEventListener('blur', () => {
      if (continuity) {
        notifyAfterFieldBlur(() => stateManager.updateChapter(continuity.id, data.id, { title: titleInput.value }), true);
      }
    });

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

    descTextarea.addEventListener('input', () => {
      if (continuity) {
        stateManager.updateChapterSilently(continuity.id, data.id, { description: descTextarea.value });
      }
    });

    // Notify after leaving the sidebar, without rebuilding it during an internal click.
    descTextarea.addEventListener('blur', () => {
      if (continuity) {
        notifyAfterFieldBlur(() => stateManager.updateChapter(continuity.id, data.id, { description: descTextarea.value }));
      }
    });

    if (continuity) {
      const arcGroup = document.createElement('div');
      arcGroup.className = 'form-group';
      
      const arcLabel = document.createElement('label');
      arcLabel.textContent = 'Arc';
      arcGroup.appendChild(arcLabel);

      const arcSelect = document.createElement('select');
      arcSelect.id = 'chapter-arc-select';
      
      // Add "No Arc" option
      const noArcOption = document.createElement('option');
      noArcOption.value = '';
      noArcOption.textContent = 'No Arc';
      if (!data.arcId) {
        noArcOption.selected = true;
      }
      arcSelect.appendChild(noArcOption);
      
      continuity.arcs.forEach(arc => {
        const option = document.createElement('option');
        option.value = arc.id;
        option.textContent = arc.name;
        if (arc.id === data.arcId) {
          option.selected = true;
        }
        arcSelect.appendChild(option);
      });

      arcGroup.appendChild(arcSelect);
      content.appendChild(arcGroup);

      // Autosave on change
      arcSelect.addEventListener('change', () => {
        stateManager.updateChapter(continuity.id, data.id, { arcId: arcSelect.value || undefined });
      });

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

      // Autosave on blur
      gridLengthInput.addEventListener('blur', () => {
        const gridLengthValue = parseInt(gridLengthInput.value, 10);
        const finalValue = isNaN(gridLengthValue) || gridLengthValue < 0 ? 0 : gridLengthValue;
        stateManager.updateChapter(continuity.id, data.id, { gridLength: finalValue });
      });
    }
  } else if (type === 'textbox') {
    // Textbox editing - content and font size fields
    const contentGroup = document.createElement('div');
    contentGroup.className = 'form-group';
    
    const contentLabel = document.createElement('label');
    contentLabel.textContent = 'Content (Markdown)';
    contentGroup.appendChild(contentLabel);

    const contentTextarea = document.createElement('textarea');
    contentTextarea.value = data.content || '';
    contentTextarea.placeholder = 'Enter textbox content (supports Markdown)';
    contentTextarea.id = 'textbox-content-input';
    contentTextarea.style.minHeight = '200px';
    contentGroup.appendChild(contentTextarea);

    content.appendChild(contentGroup);

    if (data.shapeType) {
      const shapeGroup = document.createElement('div');
      shapeGroup.className = 'form-group';
      const shapeLabel = document.createElement('label');
      shapeLabel.textContent = 'Shape';
      const shapeSelect = document.createElement('select');
      ['square', 'circle', 'triangle'].forEach(shapeType => {
        const option = document.createElement('option'); option.value = shapeType; option.textContent = shapeType[0].toUpperCase() + shapeType.slice(1);
        option.selected = data.shapeType === shapeType; shapeSelect.appendChild(option);
      });
      shapeSelect.addEventListener('change', () => stateManager.updateTextbox(data.id, { shapeType: shapeSelect.value as 'square' | 'circle' | 'triangle' }));
      shapeGroup.append(shapeLabel, shapeSelect); content.appendChild(shapeGroup);
    }

    // Save while typing without recreating the focused sidebar.
    contentTextarea.addEventListener('input', () => {
      stateManager.updateTextboxSilently(data.id, { content: contentTextarea.value });
      dependencies.refreshTextboxPreview?.();
    });
    contentTextarea.addEventListener('blur', () => {
      notifyAfterFieldBlur(() => stateManager.updateTextbox(data.id, { content: contentTextarea.value }), true);
    });

    // Font size input
    const fontSizeGroup = document.createElement('div');
    fontSizeGroup.className = 'form-group';
    
    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.textContent = 'Font Size (px)';
    fontSizeGroup.appendChild(fontSizeLabel);

    const fontSizeInput = document.createElement('input');
    fontSizeInput.type = 'number';
    fontSizeInput.min = '8';
    fontSizeInput.max = '48';
    fontSizeInput.step = '1';
    fontSizeInput.value = (data.fontSize || 14).toString();
    fontSizeInput.id = 'textbox-fontsize-input';
    fontSizeGroup.appendChild(fontSizeInput);

    content.appendChild(fontSizeGroup);

    // Autosave on change
    fontSizeInput.addEventListener('change', () => {
      const fontSize = parseInt(fontSizeInput.value, 10);
      if (!isNaN(fontSize)) {
        stateManager.updateTextbox(data.id, { fontSize });
      }
    });

    // Horizontal alignment selector
    const alignXGroup = document.createElement('div');
    alignXGroup.className = 'form-group';
    
    const alignXLabel = document.createElement('label');
    alignXLabel.textContent = 'Horizontal Alignment';
    alignXGroup.appendChild(alignXLabel);

    const alignXSelect = document.createElement('select');
    alignXSelect.id = 'textbox-alignx-select';
    
    const leftOption = document.createElement('option');
    leftOption.value = 'left';
    leftOption.textContent = 'Left';
    if ((data.alignX || 'left') === 'left') {
      leftOption.selected = true;
    }
    alignXSelect.appendChild(leftOption);

    const centerOption = document.createElement('option');
    centerOption.value = 'center';
    centerOption.textContent = 'Center';
    if (data.alignX === 'center') {
      centerOption.selected = true;
    }
    alignXSelect.appendChild(centerOption);

    const rightOption = document.createElement('option');
    rightOption.value = 'right';
    rightOption.textContent = 'Right';
    if (data.alignX === 'right') {
      rightOption.selected = true;
    }
    alignXSelect.appendChild(rightOption);

    alignXGroup.appendChild(alignXSelect);
    content.appendChild(alignXGroup);

    // Autosave on change
    alignXSelect.addEventListener('change', () => {
      stateManager.updateTextbox(data.id, { alignX: alignXSelect.value as 'left' | 'center' | 'right' });
    });

    // Vertical alignment selector
    const alignYGroup = document.createElement('div');
    alignYGroup.className = 'form-group';
    
    const alignYLabel = document.createElement('label');
    alignYLabel.textContent = 'Vertical Alignment';
    alignYGroup.appendChild(alignYLabel);

    const alignYSelect = document.createElement('select');
    alignYSelect.id = 'textbox-aligny-select';
    
    const topOption = document.createElement('option');
    topOption.value = 'top';
    topOption.textContent = 'Top';
    if ((data.alignY || 'top') === 'top') {
      topOption.selected = true;
    }
    alignYSelect.appendChild(topOption);

    const middleOption = document.createElement('option');
    middleOption.value = 'middle';
    middleOption.textContent = 'Middle';
    if (data.alignY === 'middle') {
      middleOption.selected = true;
    }
    alignYSelect.appendChild(middleOption);

    const bottomOption = document.createElement('option');
    bottomOption.value = 'bottom';
    bottomOption.textContent = 'Bottom';
    if (data.alignY === 'bottom') {
      bottomOption.selected = true;
    }
    alignYSelect.appendChild(bottomOption);

    alignYGroup.appendChild(alignYSelect);
    content.appendChild(alignYGroup);

    // Autosave on change
    alignYSelect.addEventListener('change', () => {
      stateManager.updateTextbox(data.id, { alignY: alignYSelect.value as 'top' | 'middle' | 'bottom' });
    });
  } else if (type === 'branch') {
    // Branch editing - description and line style fields
    
    // Check if this is a legacy branch (missing chapter IDs) and show warning
    // Only show warning if at least one timeline has chapters but we still don't have chapter IDs
    let shouldShowWarning = !data.startChapterId || !data.endChapterId;
    
    if (shouldShowWarning && data.startContinuityId && data.endContinuityId) {
      // Check if both timelines are legitimately empty
      const state = stateManager.getState();
      if (state.currentProject) {
        const startCont = state.currentProject.continuities.find(c => c.id === data.startContinuityId);
        const endCont = state.currentProject.continuities.find(c => c.id === data.endContinuityId);
        
        // If both timelines have no chapters, undefined IDs are expected → no warning
        if (startCont && endCont && startCont.chapters.length === 0 && endCont.chapters.length === 0) {
          shouldShowWarning = false;
        }
      }
    }
    
    if (shouldShowWarning) {
      const warningDiv = document.createElement('div');
      warningDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 4px; margin-bottom: 16px;';
      
      const warningIcon = document.createElement('img');
      warningIcon.src = '/assets/icons/alert-triangle-yellow.svg';
      warningIcon.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;';
      warningIcon.alt = 'Warning';
      
      const warningText = document.createElement('div');
      warningText.style.cssText = 'color: #f59e0b; font-size: 13px; line-height: 1.5;';
      warningText.textContent = 'This branch was created in an outdated version of Continuity and may exhibit incorrect behavior. Please recreate the branch to ensure proper function.';
      
      warningDiv.appendChild(warningIcon);
      warningDiv.appendChild(warningText);
      content.appendChild(warningDiv);
    }
    
    const descGroup = document.createElement('div');
    descGroup.className = 'form-group';
    
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descGroup.appendChild(descLabel);

    const descTextarea = document.createElement('textarea');
    descTextarea.value = data.description || '';
    descTextarea.placeholder = 'Enter branch description';
    descTextarea.id = 'branch-desc-input';
    descGroup.appendChild(descTextarea);

    content.appendChild(descGroup);

    descTextarea.addEventListener('input', () => {
      stateManager.updateBranchSilently(data.id, { description: descTextarea.value });
    });

    // Notify after leaving the sidebar, without rebuilding it during an internal click.
    descTextarea.addEventListener('blur', () => {
      notifyAfterFieldBlur(() => stateManager.updateBranch(data.id, { description: descTextarea.value }));
    });

    // Line style selector
    const lineStyleGroup = document.createElement('div');
    lineStyleGroup.className = 'form-group';
    
    const lineStyleLabel = document.createElement('label');
    lineStyleLabel.textContent = 'Line Style';
    lineStyleGroup.appendChild(lineStyleLabel);

    const lineStyleSelect = document.createElement('select');
    lineStyleSelect.id = 'branch-linestyle-select';
    
    const solidOption = document.createElement('option');
    solidOption.value = 'solid';
    solidOption.textContent = 'Solid';
    if ((data.lineStyle || 'solid') === 'solid') {
      solidOption.selected = true;
    }
    lineStyleSelect.appendChild(solidOption);
    
    const dashedOption = document.createElement('option');
    dashedOption.value = 'dashed';
    dashedOption.textContent = 'Dashed';
    if (data.lineStyle === 'dashed') {
      dashedOption.selected = true;
    }
    lineStyleSelect.appendChild(dashedOption);

    lineStyleGroup.appendChild(lineStyleSelect);
    content.appendChild(lineStyleGroup);

    // Autosave on change
    lineStyleSelect.addEventListener('change', () => {
      stateManager.updateBranch(data.id, { lineStyle: lineStyleSelect.value as 'solid' | 'dashed' });
    });

    addLineWidthInput(content, data.lineWidth ?? 3, 'branch-linewidth-input', value => stateManager.updateBranch(data.id, { lineWidth: value }));

    // Start endpoint style
    const branchStartEndpointGroup = document.createElement('div');
    branchStartEndpointGroup.className = 'form-group';
    const branchStartEndpointLabel = document.createElement('label');
    branchStartEndpointLabel.textContent = 'Start Endpoint';
    branchStartEndpointGroup.appendChild(branchStartEndpointLabel);

    const branchStartEndpointSelect = document.createElement('select');
    branchStartEndpointSelect.id = 'branch-start-endpoint-select';
    ['dot', 'arrow', 'none'].forEach(style => {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        if (data.startEndpointStyle === style || (style === 'dot' && !data.startEndpointStyle)) {
        option.selected = true;
      }
      branchStartEndpointSelect.appendChild(option);
    });
    branchStartEndpointGroup.appendChild(branchStartEndpointSelect);
    content.appendChild(branchStartEndpointGroup);

    branchStartEndpointSelect.addEventListener('change', () => {
      stateManager.updateBranch(data.id, { startEndpointStyle: branchStartEndpointSelect.value as 'dot' | 'arrow' | 'none' });
    });

    // End endpoint style
    const branchEndEndpointGroup = document.createElement('div');
    branchEndEndpointGroup.className = 'form-group';
    const branchEndEndpointLabel = document.createElement('label');
    branchEndEndpointLabel.textContent = 'End Endpoint';
    branchEndEndpointGroup.appendChild(branchEndEndpointLabel);

    const branchEndEndpointSelect = document.createElement('select');
    branchEndEndpointSelect.id = 'branch-end-endpoint-select';
    ['dot', 'arrow', 'none'].forEach(style => {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        if (data.endEndpointStyle === style || (style === 'dot' && !data.endEndpointStyle)) {
        option.selected = true;
      }
      branchEndEndpointSelect.appendChild(option);
    });
    branchEndEndpointGroup.appendChild(branchEndEndpointSelect);
    content.appendChild(branchEndEndpointGroup);

    branchEndEndpointSelect.addEventListener('change', () => {
      stateManager.updateBranch(data.id, { endEndpointStyle: branchEndEndpointSelect.value as 'dot' | 'arrow' | 'none' });
    });

    const flipEndpointsButton = document.createElement('button');
    flipEndpointsButton.type = 'button';
    flipEndpointsButton.className = 'btn btn-small';
    flipEndpointsButton.textContent = 'Flip Endpoints';
    flipEndpointsButton.title = 'Swap the styles shown at the start and end of this branch';
    flipEndpointsButton.addEventListener('click', () => {
      const start = branchStartEndpointSelect.value as 'dot' | 'arrow' | 'none';
      branchStartEndpointSelect.value = branchEndEndpointSelect.value;
      branchEndEndpointSelect.value = start;
      stateManager.updateBranch(data.id, {
        startEndpointStyle: branchStartEndpointSelect.value as 'dot' | 'arrow' | 'none',
        endEndpointStyle: branchEndEndpointSelect.value as 'dot' | 'arrow' | 'none',
      });
    });
    content.appendChild(flipEndpointsButton);
  } else if (type === 'line') {
    // Line editing - line style and endpoint styles
    const lineStyleGroup = document.createElement('div');
    lineStyleGroup.className = 'form-group';
    
    const lineStyleLabel = document.createElement('label');
    lineStyleLabel.textContent = 'Line Style';
    lineStyleGroup.appendChild(lineStyleLabel);

    const lineStyleSelect = document.createElement('select');
    lineStyleSelect.id = 'line-linestyle-select';
    
    const solidOption = document.createElement('option');
    solidOption.value = 'solid';
    solidOption.textContent = 'Solid';
    if ((data.lineStyle || 'solid') === 'solid') {
      solidOption.selected = true;
    }
    lineStyleSelect.appendChild(solidOption);
    
    const dashedOption = document.createElement('option');
    dashedOption.value = 'dashed';
    dashedOption.textContent = 'Dashed';
    if (data.lineStyle === 'dashed') {
      dashedOption.selected = true;
    }
    lineStyleSelect.appendChild(dashedOption);

    lineStyleGroup.appendChild(lineStyleSelect);
    content.appendChild(lineStyleGroup);

    // Autosave on change
    lineStyleSelect.addEventListener('change', () => {
      stateManager.updateLine(data.id, { lineStyle: lineStyleSelect.value as 'solid' | 'dashed' });
    });

    addLineWidthInput(content, data.lineWidth, 'line-linewidth-input', value => stateManager.updateLine(data.id, { lineWidth: value }));

    // Start endpoint style
    const startEndpointGroup = document.createElement('div');
    startEndpointGroup.className = 'form-group';
    
    const startEndpointLabel = document.createElement('label');
    startEndpointLabel.textContent = 'Start Endpoint';
    startEndpointGroup.appendChild(startEndpointLabel);

    const startEndpointSelect = document.createElement('select');
    startEndpointSelect.id = 'line-start-endpoint-select';
    
    ['dot', 'arrow', 'none'].forEach(style => {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        if (data.startEndpointStyle === style || (style === 'dot' && !data.startEndpointStyle)) {
        option.selected = true;
      }
      startEndpointSelect.appendChild(option);
    });

    startEndpointGroup.appendChild(startEndpointSelect);
    content.appendChild(startEndpointGroup);

    // Autosave on change
    startEndpointSelect.addEventListener('change', () => {
      stateManager.updateLine(data.id, { startEndpointStyle: startEndpointSelect.value as 'dot' | 'arrow' | 'none' });
    });

    // End endpoint style
    const endEndpointGroup = document.createElement('div');
    endEndpointGroup.className = 'form-group';
    
    const endEndpointLabel = document.createElement('label');
    endEndpointLabel.textContent = 'End Endpoint';
    endEndpointGroup.appendChild(endEndpointLabel);

    const endEndpointSelect = document.createElement('select');
    endEndpointSelect.id = 'line-end-endpoint-select';
    
    ['dot', 'arrow', 'none'].forEach(style => {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        if (data.endEndpointStyle === style || (style === 'dot' && !data.endEndpointStyle)) {
        option.selected = true;
      }
      endEndpointSelect.appendChild(option);
    });

    endEndpointGroup.appendChild(endEndpointSelect);
    content.appendChild(endEndpointGroup);

    // Autosave on change
    endEndpointSelect.addEventListener('change', () => {
      stateManager.updateLine(data.id, { endEndpointStyle: endEndpointSelect.value as 'dot' | 'arrow' | 'none' });
    });

    const flipEndpointsButton = document.createElement('button');
    flipEndpointsButton.type = 'button';
    flipEndpointsButton.className = 'btn btn-small';
    flipEndpointsButton.textContent = 'Flip Endpoints';
    flipEndpointsButton.title = 'Swap the styles shown at the start and end of this line';
    flipEndpointsButton.addEventListener('click', () => {
      const start = startEndpointSelect.value as 'dot' | 'arrow' | 'none';
      startEndpointSelect.value = endEndpointSelect.value;
      endEndpointSelect.value = start;
      stateManager.updateLine(data.id, {
        startEndpointStyle: startEndpointSelect.value as 'dot' | 'arrow' | 'none',
        endEndpointStyle: endEndpointSelect.value as 'dot' | 'arrow' | 'none',
      });
    });
    content.appendChild(flipEndpointsButton);
  }

  sidebar.appendChild(content);

  const actions = document.createElement('div');
  actions.className = 'edit-sidebar-actions';



  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    const confirmModal = dependencies.createConfirmModal(
      `Delete ${type}?`,
      `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      () => {
        if (type === 'timeline') {
          stateManager.removeContinuity(data.id);
        } else if (type === 'chapter' && continuity) {
          stateManager.removeChapter(continuity.id, data.id);
        } else if (type === 'branch') {
          stateManager.removeBranch(data.id);
        } else if (type === 'textbox') {
          stateManager.removeTextbox(data.id);
        } else if (type === 'line') {
          stateManager.removeLine(data.id);
        }
        onClose();
      }
    );
    document.body.appendChild(confirmModal);
  });

  actions.appendChild(deleteBtn);

  sidebar.appendChild(actions);

  // Auto-focus the appropriate input only on initial creation
  if (autoFocus) {
    setTimeout(() => {
      if (type === 'timeline') {
        const nameInput = sidebar.querySelector('#timeline-name-input') as HTMLInputElement;
        if (nameInput) nameInput.focus();
      } else if (type === 'chapter') {
        const titleInput = sidebar.querySelector('#chapter-title-input') as HTMLInputElement;
        if (titleInput) titleInput.focus();
      } else if (type === 'branch') {
        const descTextarea = sidebar.querySelector('#branch-desc-input') as HTMLTextAreaElement;
        if (descTextarea) descTextarea.focus();
      } else if (type === 'textbox') {
        const contentTextarea = sidebar.querySelector('#textbox-content-input') as HTMLTextAreaElement;
        if (contentTextarea) contentTextarea.focus();
      }
    }, 0);
  }

  return sidebar;
}

function addLineWidthInput(content: HTMLElement, value: number | undefined, id: string, onChange: (value: number) => void): void {
  const group = document.createElement('div');
  group.className = 'form-group';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = 'Line Width (px)';
  const input = document.createElement('input');
  input.id = id;
  input.type = 'number';
  input.min = '1';
  input.max = '40';
  input.step = '1';
  input.value = String(Math.min(40, Math.max(1, value ?? 2)));
  input.addEventListener('change', () => {
    const width = Math.min(40, Math.max(1, Number.parseInt(input.value, 10) || 1));
    input.value = String(width);
    onChange(width);
  });
  group.append(label, input);
  content.appendChild(group);
}
