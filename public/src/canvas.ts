/**
 * Canvas-based interactive timeline editor
 * Handles dragging, zooming, and visual rendering of timelines
 */

import { marked } from 'marked';

export interface TimelinePosition {
  id: string;
  name: string; // Timeline name/title
  x: number;
  y: number;
  width: number;
  height: number;
  chapters?: TimelineChapter[];
}

export interface TimelineChapter {
  id: string;
  title: string;
  x: number; // Position on the timeline (0-based gridspace)
  width: number; // Width in gridspaces
  arcId?: string; // Arc this chapter belongs to
}

export class TimelineCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private menuCanvas: HTMLCanvasElement;
  private menuCtx: CanvasRenderingContext2D;
  private container: HTMLElement;
  
  // Camera/viewport
  private offsetX: number = 0;
  private offsetY: number = 0;
  private zoom: number = 1;
  
  // Interaction
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartOffsetX: number = 0;
  private dragStartOffsetY: number = 0;
  
  // Timeline dragging
  private isDraggingTimeline: boolean = false;
  private draggedTimelineId: string | null = null;
  private timelineDragStartX: number = 0;
  private timelineDragStartY: number = 0;
  private timelineOriginalX: number = 0;
  private timelineOriginalY: number = 0;
  private dragDelayTimer: number | null = null;
  private pendingDragTimelineId: string | null = null;
  
  // Chapter dragging
  private isDraggingChapter: boolean = false;
  private draggedChapterId: string | null = null;
  private draggedChapterTimelineId: string | null = null;
  private chapterDragStartX: number = 0;
  private chapterOriginalX: number = 0;
  private pendingDragChapterId: string | null = null;
  private pendingDragChapterTimelineId: string | null = null;
  
  // Arc dragging
  private isDraggingArc: boolean = false;
  private draggedArcId: string | null = null;
  private draggedArcTimelineId: string | null = null;
  private pendingDragArcId: string | null = null;
  private pendingDragArcTimelineId: string | null = null;
  private hoveredArcInsertionPoint: { timelineId: string | null; position: number } = { timelineId: null, position: -1 };
  
  // Textbox pending drag
  private pendingDragTextboxId: string | null = null;
  
  // Timelines
  private timelines: TimelinePosition[] = [];
  private timelineHeight: number = 200;
  
  
  // Menu system
  private menu: MenuSystem;
  private hoveredMenuOptionId: string | null = null;
  
  // Chapter insertion mode
  private insertionMode: boolean = false;
  private hoveredInsertionPoint: { timelineId: string | null; position: number } = { timelineId: null, position: -1 };
  
  // Branch insertion mode
  private branchInsertionMode: boolean = false;
  private branchFirstPoint: { timelineId: string; position: number } | null = null;
  private branchHoveredPoint: { timelineId: string | null; position: number } = { timelineId: null, position: -1 };
  private branches: any[] = []; // Will store all branches for rendering
  
  // Arc data
  private timelineArcs: Map<string, any[]> = new Map(); // timelineId -> arcs
  
  // Textboxes
  private textboxes: any[] = []; // Will store all textboxes for rendering
  private textboxOverlayContainer: HTMLElement | null = null;
  private textboxElements: Map<string, HTMLElement> = new Map();
  private isDraggingTextbox: boolean = false;
  private draggedTextboxId: string | null = null;
  private textboxDragStartX: number = 0;
  private textboxDragStartY: number = 0;
  private textboxOriginalX: number = 0;
  private textboxOriginalY: number = 0;
  private isResizingTextbox: boolean = false;
  private resizedTextboxId: string | null = null;
  // @ts-ignore - kept for reference but captured locally in closure now
  private resizeHandle: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null = null;
  private resizeStartX: number = 0;
  private resizeStartY: number = 0;
  private resizeOriginalWidth: number = 0;
  private resizeOriginalHeight: number = 0;
  private hoveredTextboxId: string | null = null; // For hover state

  // Lines
  private lines: any[] = []; // Will store all lines for rendering
  private lineInsertionMode: boolean = false;
  private lineFirstPoint: { gridX: number; gridY: number } | null = null;
  private lineHoveredPoint: { gridX: number; gridY: number } | null = null;
  private isDraggingLine: boolean = false;
  private draggedLineId: string | null = null;
  private isDraggingLineEndpoint: boolean = false;
  private draggedLineEndpoint: 'start' | 'end' | null = null;
  private pendingDragLineId: string | null = null;
  private pendingDragLineEndpointLineId: string | null = null;
  private pendingDragLineEndpoint: 'start' | 'end' | null = null;
  private lineDragStartX: number = 0;
  private lineDragStartY: number = 0;
  private lineOriginalX1: number = 0;
  private lineOriginalY1: number = 0;
  private lineOriginalX2: number = 0;
  private lineOriginalY2: number = 0;
  
  // Grid settings
  private gridSize: number = 50; // In pixels
  
  // Centering animation
  private isCentering: boolean = false;
  private centeringStartOffset: { x: number; y: number } = { x: 0, y: 0 };
  private centeringTargetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private centeringDuration: number = 500; // milliseconds
  private centeringStartTime: number = 0;
  
  // Animation state
  private animationRunning: boolean = false;
  private suppressMenuRender: boolean = false; // Hide menu for exports/snapshots
  private suppressTextboxRender: boolean = false; // Skip DOM textbox overlay (e.g., offscreen export)
  
  // Callbacks
  private onAddTimeline: (() => void) | null = null;
  private onAddChapter: ((timelineId: string, position: number) => void) | null = null;
  private onAddBranch: ((startTimelineId: string, startPosition: number, endTimelineId: string, endPosition: number) => void) | null = null;
  private onAddTextbox: ((x: number, y: number) => void) | null = null;
  private onAddLine: ((gridX1: number, gridY1: number, gridX2: number, gridY2: number) => void) | null = null;
  private onEditTimeline: ((timelineId: string) => void) | null = null;
  private onEditChapter: ((chapterId: string) => void) | null = null;
  private onEditBranch: ((branchId: string) => void) | null = null;
  private onEditTextbox: ((textboxId: string) => void) | null = null;
  private onEditLine: ((lineId: string) => void) | null = null;
  private onReorderChapter: ((timelineId: string, chapterId: string, newPosition: number) => void) | null = null;
  private onTimelineHovered: ((timelineId: string | null, position: 'above' | 'below') => void) | null = null;
  private onTimelineMoved: ((timelineId: string, x: number, y: number) => void) | null = null;
  private onReorderArc: ((timelineId: string, arcId: string, newPosition: number) => void) | null = null;
  private onBackgroundClick: (() => void) | null = null;
  private onTextboxMoved: ((textboxId: string, x: number, y: number) => void) | null = null;
  private onTextboxResized: ((textboxId: string, width: number, height: number) => void) | null = null;
  private onLineMoved: ((lineId: string, gridX1: number, gridY1: number, gridX2: number, gridY2: number) => void) | null = null;
  private getStateChaptersForTimeline: ((timelineId: string) => any[]) | null = null;
  private hoveredInsertZone: { timelineId: string | null; position: 'above' | 'below' } = { timelineId: null, position: 'below' };

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    // Create separate canvas for menu
    this.menuCanvas = document.createElement('canvas');
    this.menuCtx = this.menuCanvas.getContext('2d')!;
    
    // Create overlay container for textboxes
    this.textboxOverlayContainer = document.createElement('div');
    this.textboxOverlayContainer.style.position = 'absolute';
    this.textboxOverlayContainer.style.top = '0';
    this.textboxOverlayContainer.style.left = '0';
    this.textboxOverlayContainer.style.pointerEvents = 'auto';
    
    this.menu = new MenuSystem();
    
    this.setupCanvas();
    this.setupEventListeners();
    this.render();
  }

  

  private setupCanvas(): void {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'grab';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '1';
    this.container.appendChild(this.canvas);
    
    // Setup menu canvas above the main canvas
    this.menuCanvas.width = this.container.clientWidth;
    this.menuCanvas.height = this.container.clientHeight;
    this.menuCanvas.style.display = 'block';
    this.menuCanvas.style.position = 'absolute';
    this.menuCanvas.style.top = '0';
    this.menuCanvas.style.left = '0';
    this.menuCanvas.style.zIndex = '5';
    this.menuCanvas.style.pointerEvents = 'none';
    this.container.appendChild(this.menuCanvas);
    
    // Add overlay container for textboxes (non-interactive; events go to canvas)
    if (this.textboxOverlayContainer) {
      this.textboxOverlayContainer.style.width = this.canvas.width + 'px';
      this.textboxOverlayContainer.style.height = this.canvas.height + 'px';
      this.textboxOverlayContainer.style.pointerEvents = 'none';
      this.container.appendChild(this.textboxOverlayContainer);
    }
    
    // Start animation loop
    this.startAnimationLoop();
  }

  private startAnimationLoop(): void {
    const animate = () => {
      if (this.animationRunning || this.isCentering) {
        this.render();
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  private setupEventListeners(): void {
    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const oldZoom = this.zoom;
      this.zoom *= zoomFactor;
      this.zoom = Math.max(0.5, Math.min(3, this.zoom)); // Clamp zoom
      
      // Zoom towards mouse position
      const zoomDiff = this.zoom - oldZoom;
      this.offsetX -= (mouseX - this.offsetX) * (zoomDiff / oldZoom);
      this.offsetY -= (mouseY - this.offsetY) * (zoomDiff / oldZoom);
      
      this.render();
    });

    // Mouse drag
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if clicking menu button
        if (this.menu.isClickingButton(mouseX, mouseY)) {
          this.menu.toggle();
          this.render();
          return;
        }

        // Check if clicking menu item
        const clickedOptionId = this.menu.getClickedOption(mouseX, mouseY);
        if (clickedOptionId) {
          // Handle the option click
          if (clickedOptionId === 'new-timeline' && this.onAddTimeline) {
            this.onAddTimeline();
          } else if (clickedOptionId === 'new-chapter') {
            // Toggle insertion mode
            this.insertionMode = !this.insertionMode;
            this.hoveredInsertionPoint = { timelineId: null, position: -1 };
          } else if (clickedOptionId === 'new-branch') {
            // Toggle branch insertion mode
            this.branchInsertionMode = !this.branchInsertionMode;
            this.branchFirstPoint = null;
            this.branchHoveredPoint = { timelineId: null, position: -1 };
          } else if (clickedOptionId === 'new-line') {
            // Toggle line insertion mode
            this.lineInsertionMode = !this.lineInsertionMode;
            this.lineFirstPoint = null;
            this.lineHoveredPoint = null;
          } else if (clickedOptionId === 'new-textbox' && this.onAddTextbox) {
            // Create textbox at center of canvas
            const centerX = (this.canvas.width / 2 - this.offsetX) / this.zoom;
            const centerY = (this.canvas.height / 2 - this.offsetY) / this.zoom;
            this.onAddTextbox(centerX, centerY);
          }
          // Close menu smoothly
          this.menu.close();
          this.render();
          return;
        }

        // Close menu if clicking elsewhere
        if (this.menu.isOpen()) {
          this.menu.close();
          this.render();
          return;
        }

        // Handle insertion mode
        if (this.insertionMode) {
          const clickResult = this.getClickedInsertionPoint(mouseX, mouseY);
          if (clickResult) {
            // Valid insertion point clicked
            if (this.onAddChapter) {
              this.onAddChapter(clickResult.timelineId, clickResult.position);
            }
            this.insertionMode = false;
            this.render();
          } else {
            // Invalid location, exit insertion mode
            this.insertionMode = false;
            this.render();
          }
          return;
        }

        // Handle branch insertion mode
        if (this.branchInsertionMode) {
          const clickResult = this.getClickedBranchInsertionPoint(mouseX, mouseY);
          if (clickResult) {
            if (!this.branchFirstPoint) {
              // First point selected - store timeline ID and grid position
              this.branchFirstPoint = { 
                timelineId: clickResult.timelineId, 
                position: clickResult.gridPosition 
              };
              this.render();
            } else {
              // Second point selected - validate and create branch
              if (clickResult.timelineId !== this.branchFirstPoint.timelineId) {
                // Valid: different timelines
                if (this.onAddBranch) {
                  this.onAddBranch(
                    this.branchFirstPoint.timelineId,
                    this.branchFirstPoint.position,
                    clickResult.timelineId,
                    clickResult.gridPosition
                  );
                }
                this.branchInsertionMode = false;
                this.branchFirstPoint = null;
                this.render();
              } else {
                // Invalid: same timeline - do nothing, wait for valid second point
                // Could optionally show an error or just ignore
              }
            }
          } else {
            // Invalid location, exit branch insertion mode
            this.branchInsertionMode = false;
            this.branchFirstPoint = null;
            this.render();
          }
          return;
        }

        // Handle line insertion mode
        if (this.lineInsertionMode) {
          // Get grid position from mouse coords
          const gridX = Math.round(((mouseX - this.offsetX) / this.zoom) / this.gridSize);
          const gridY = Math.round(((mouseY - this.offsetY) / this.zoom) / this.gridSize);

          if (!this.lineFirstPoint) {
            // First point selected
            this.lineFirstPoint = { gridX, gridY };
            this.render();
          } else {
            // Second point selected - create line
            if (gridX !== this.lineFirstPoint.gridX || gridY !== this.lineFirstPoint.gridY) {
              // Valid: different points
              if (this.onAddLine) {
                this.onAddLine(
                  this.lineFirstPoint.gridX,
                  this.lineFirstPoint.gridY,
                  gridX,
                  gridY
                );
              }
              this.lineInsertionMode = false;
              this.lineFirstPoint = null;
              this.render();
            } else {
              // Invalid: same point - do nothing, wait for different second point
            }
          }
          return;
        }

        // Check for double-click on timeline title
        const now = Date.now();
        const lastClickTime = (this.canvas as any).lastClickTime || 0;
        const lastClickX = (this.canvas as any).lastClickX || 0;
        const lastClickY = (this.canvas as any).lastClickY || 0;
        const isDoubleClick = now - lastClickTime < 300 && 
                             Math.abs(mouseX - lastClickX) < 10 && 
                             Math.abs(mouseY - lastClickY) < 10;
        (this.canvas as any).lastClickTime = now;
        (this.canvas as any).lastClickX = mouseX;
        (this.canvas as any).lastClickY = mouseY;

        if (isDoubleClick) {
          // Clear any pending drag
          if (this.dragDelayTimer) {
            clearTimeout(this.dragDelayTimer);
            this.dragDelayTimer = null;
            this.pendingDragTimelineId = null;
            this.pendingDragLineId = null;
            this.pendingDragLineEndpointLineId = null;
            this.pendingDragLineEndpoint = null;
          }
          
          const clickedElement = this.getClickedTimelineOrChapter(mouseX, mouseY);
          if (clickedElement?.type === 'timeline-title' && this.onEditTimeline) {
            this.onEditTimeline(clickedElement.id);
            return;
          } else if (clickedElement?.type === 'chapter') {
            // Double-click on a chapter opens chapter edit (unless it's head/tail)
            const chapter = clickedElement;
            if (chapter.title !== 'Head' && chapter.title !== 'Tail' && this.onEditChapter) {
              this.onEditChapter(chapter.id);
            } else if (this.onEditTimeline && chapter.timelineId) {
              // Head/tail chapters open timeline edit
              this.onEditTimeline(chapter.timelineId);
            }
            return;
          }
          
          // Check for double-click on a branch
          const clickedBranchId = this.getClickedBranch(mouseX, mouseY);
          if (clickedBranchId && this.onEditBranch) {
            this.onEditBranch(clickedBranchId);
            return;
          }
          
          // Check for double-click on a textbox
          const textboxClickResult = this.getClickedTextboxElement(mouseX, mouseY);
          if (textboxClickResult && this.onEditTextbox) {
            this.onEditTextbox(textboxClickResult.textboxId);
            return;
          }

          // Check for double-click on a line
          const clickedLineId = this.getClickedLine(mouseX, mouseY);
          if (clickedLineId && this.onEditLine) {
            this.onEditLine(clickedLineId);
            return;
          }
        }

        // Check if clicking on draggable timeline element (title, head, or tail)
        // Use a small delay before starting drag to allow double-click detection
        const draggableElement = this.isDraggableTimelineElement(mouseX, mouseY);
        if (draggableElement?.isDraggable) {
          this.pendingDragTimelineId = draggableElement.timelineId;
          this.timelineDragStartX = mouseX;
          this.timelineDragStartY = mouseY;
          
          const timeline = this.timelines.find(t => t.id === draggableElement.timelineId);
          if (timeline) {
            this.timelineOriginalX = timeline.x;
            this.timelineOriginalY = timeline.y;
          }
          
          // Delay drag start to allow double-click detection
          this.dragDelayTimer = window.setTimeout(() => {
            if (this.pendingDragTimelineId) {
              this.isDraggingTimeline = true;
              this.draggedTimelineId = this.pendingDragTimelineId;
              this.canvas.style.cursor = 'move';
            }
            this.dragDelayTimer = null;
          }, 150);
          return;
        }

        // Check if clicking on draggable chapter (regular chapters, not Head/Tail)
        const draggableChapter = this.isDraggableChapterElement(mouseX, mouseY);
        if (draggableChapter) {
          // Store pending drag info
          this.pendingDragChapterId = draggableChapter.chapterId;
          this.pendingDragChapterTimelineId = draggableChapter.timelineId;
          this.chapterDragStartX = mouseX;
          this.chapterOriginalX = draggableChapter.x;
          
          // Delay drag start to allow double-click detection
          this.dragDelayTimer = window.setTimeout(() => {
            if (this.pendingDragChapterId) {
              this.isDraggingChapter = true;
              this.draggedChapterId = this.pendingDragChapterId;
              this.draggedChapterTimelineId = this.pendingDragChapterTimelineId;
              this.canvas.style.cursor = 'move';
            }
            this.dragDelayTimer = null;
          }, 150);
          return;
        }

        // Check if clicking on draggable arc title (in arc mode)
        const draggableArc = this.isDraggableArcElement(mouseX, mouseY);
        if (draggableArc) {
          // Store pending drag info
          this.pendingDragArcId = draggableArc.arcId;
          this.pendingDragArcTimelineId = draggableArc.timelineId;
          
          // Delay drag start to allow double-click detection
          this.dragDelayTimer = window.setTimeout(() => {
            if (this.pendingDragArcId) {
              this.isDraggingArc = true;
              this.draggedArcId = this.pendingDragArcId;
              this.draggedArcTimelineId = this.pendingDragArcTimelineId;
              this.canvas.style.cursor = 'move';
            }
            this.dragDelayTimer = null;
          }, 150);
          return;
        }

        // Check if clicking on textbox or its resize handle
        const textboxClickResult = this.getClickedTextboxElement(mouseX, mouseY);
        if (textboxClickResult) {
          if (textboxClickResult.type === 'resize-handle') {
            // Start textbox resize
            this.isResizingTextbox = true;
            this.resizedTextboxId = textboxClickResult.textboxId;
            this.resizeHandle = textboxClickResult.handle as 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
            this.resizeStartX = mouseX;
            this.resizeStartY = mouseY;
            const resizeHandle = textboxClickResult.handle as 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
            const textbox = this.textboxes.find(t => t.id === textboxClickResult.textboxId);
            if (textbox) {
              this.resizeOriginalWidth = textbox.width;
              this.resizeOriginalHeight = textbox.height;
              this.textboxOriginalX = textbox.x;
              this.textboxOriginalY = textbox.y;
            }
            this.canvas.style.cursor = this.getResizeCursor(textboxClickResult.handle as string);
            
            // Add document-level event listeners for resize to work even when mouse leaves canvas
            const handleDocumentMouseMove = (e: MouseEvent) => {
              const rect = this.canvas.getBoundingClientRect();
              const newMouseX = e.clientX - rect.left;
              const newMouseY = e.clientY - rect.top;
              
              const deltaX = newMouseX - this.resizeStartX;
              const deltaY = newMouseY - this.resizeStartY;
              
              const textbox = this.textboxes.find(t => t.id === this.resizedTextboxId);
              if (textbox) {
                // Keep hover state on the active textbox during resize to avoid flicker
                this.hoveredTextboxId = textbox.id;
                // Maintain correct resize cursor
                this.canvas.style.cursor = this.getResizeCursor(resizeHandle);
                // Convert screen delta to world delta
                const worldDeltaX = deltaX / this.zoom;
                const worldDeltaY = deltaY / this.zoom;
                
                // Resize based on handle type
                // Horizontal resizing
                if (resizeHandle.includes('e')) {
                  textbox.width = Math.max(50, this.resizeOriginalWidth + worldDeltaX);
                } else if (resizeHandle.includes('w')) {
                  const newWidth = Math.max(50, this.resizeOriginalWidth - worldDeltaX);
                  const widthDelta = this.resizeOriginalWidth - newWidth;
                  textbox.x = this.textboxOriginalX + widthDelta;
                  textbox.width = newWidth;
                }
                
                // Vertical resizing
                if (resizeHandle.includes('s')) {
                  textbox.height = Math.max(30, this.resizeOriginalHeight + worldDeltaY);
                } else if (resizeHandle.includes('n')) {
                  const newHeight = Math.max(30, this.resizeOriginalHeight - worldDeltaY);
                  const heightDelta = this.resizeOriginalHeight - newHeight;
                  textbox.y = this.textboxOriginalY + heightDelta;
                  textbox.height = newHeight;
                }
                this.render();
              }
            };
            
            const handleDocumentMouseUp = () => {
              document.removeEventListener('mousemove', handleDocumentMouseMove);
              document.removeEventListener('mouseup', handleDocumentMouseUp);
              
              if (this.isResizingTextbox && this.resizedTextboxId && this.onTextboxResized) {
                const textbox = this.textboxes.find(t => t.id === this.resizedTextboxId);
                if (textbox) {
                  this.onTextboxResized(textbox.id, textbox.width, textbox.height);
                }
              }
              
              this.isResizingTextbox = false;
              this.resizedTextboxId = null;
              this.resizeHandle = null;
              this.hoveredTextboxId = null;
              this.canvas.style.cursor = 'grab';
            };
            
            document.addEventListener('mousemove', handleDocumentMouseMove);
            document.addEventListener('mouseup', handleDocumentMouseUp);
            return;
          } else if (textboxClickResult.type === 'textbox-body') {
            // Start pending drag
            this.pendingDragTextboxId = textboxClickResult.textboxId;
            this.textboxDragStartX = mouseX;
            this.textboxDragStartY = mouseY;
            const textbox = this.textboxes.find(t => t.id === textboxClickResult.textboxId);
            if (textbox) {
              this.textboxOriginalX = textbox.x;
              this.textboxOriginalY = textbox.y;
            }
            
            // Delay drag start to allow double-click detection
            this.dragDelayTimer = window.setTimeout(() => {
              if (this.pendingDragTextboxId) {
                this.isDraggingTextbox = true;
                this.draggedTextboxId = this.pendingDragTextboxId;
                this.canvas.style.cursor = 'move';
              }
              this.dragDelayTimer = null;
            }, 150);
            return;
          }
        }

        // Check if clicking on line body (but not endpoint)
        const lineClickResult = this.getClickedLine(mouseX, mouseY);
        if (lineClickResult && !this.getClickedLineEndpoint(mouseX, mouseY)) {
          // Start line body drag
          const line = this.lines.find(l => l.id === lineClickResult);
          if (line) {
            this.pendingDragLineId = line.id;
            this.lineDragStartX = mouseX;
            this.lineDragStartY = mouseY;
            this.lineOriginalX1 = line.gridX1;
            this.lineOriginalY1 = line.gridY1;
            this.lineOriginalX2 = line.gridX2;
            this.lineOriginalY2 = line.gridY2;

            // Delay drag start to allow double-click detection
            this.dragDelayTimer = window.setTimeout(() => {
              if (this.pendingDragLineId === line.id) {
                this.isDraggingLine = true;
                this.draggedLineId = line.id;
                this.canvas.style.cursor = 'move';
                
                // Add document-level event listeners for dragging
                const handleDocumentMouseMove = (e: MouseEvent) => {
                  const rect = this.canvas.getBoundingClientRect();
                  const newMouseX = e.clientX - rect.left;
                  const newMouseY = e.clientY - rect.top;
                  
                  const deltaX = newMouseX - this.lineDragStartX;
                  const deltaY = newMouseY - this.lineDragStartY;
                  
                  const draggedLine = this.lines.find(l => l.id === this.draggedLineId);
                  if (draggedLine) {
                    const gridSize = this.gridSize;
                    const deltaGridX = Math.round(deltaX / this.zoom / gridSize);
                    const deltaGridY = Math.round(deltaY / this.zoom / gridSize);
                    
                    draggedLine.gridX1 = this.lineOriginalX1 + deltaGridX;
                    draggedLine.gridY1 = this.lineOriginalY1 + deltaGridY;
                    draggedLine.gridX2 = this.lineOriginalX2 + deltaGridX;
                    draggedLine.gridY2 = this.lineOriginalY2 + deltaGridY;
                    this.render();
                  }
                };
                
                const handleDocumentMouseUp = () => {
                  document.removeEventListener('mousemove', handleDocumentMouseMove);
                  document.removeEventListener('mouseup', handleDocumentMouseUp);
                  
                  if (this.isDraggingLine && this.draggedLineId && this.onLineMoved) {
                    const draggedLine = this.lines.find(l => l.id === this.draggedLineId);
                    if (draggedLine) {
                      this.onLineMoved(draggedLine.id, draggedLine.gridX1, draggedLine.gridY1, draggedLine.gridX2, draggedLine.gridY2);
                    }
                  }
                  
                  this.isDraggingLine = false;
                  this.draggedLineId = null;
                  this.canvas.style.cursor = 'grab';
                };
                
                document.addEventListener('mousemove', handleDocumentMouseMove);
                document.addEventListener('mouseup', handleDocumentMouseUp);
              }
              this.dragDelayTimer = null;
            }, 150);
          }
          return;
        }

        // Check if clicking on line endpoint
        const lineEndpointClickResult = this.getClickedLineEndpoint(mouseX, mouseY);
        if (lineEndpointClickResult) {
          // Start line endpoint drag with delay
          this.pendingDragLineEndpointLineId = lineEndpointClickResult.lineId;
          this.pendingDragLineEndpoint = lineEndpointClickResult.endpoint;

          this.dragDelayTimer = window.setTimeout(() => {
            if (
              this.pendingDragLineEndpointLineId === lineEndpointClickResult.lineId &&
              this.pendingDragLineEndpoint === lineEndpointClickResult.endpoint
            ) {
              this.isDraggingLineEndpoint = true;
              this.draggedLineId = lineEndpointClickResult.lineId;
              this.draggedLineEndpoint = lineEndpointClickResult.endpoint;
              this.canvas.style.cursor = 'move';
              
              // Add document-level event listeners for dragging
              const handleDocumentMouseMove = (e: MouseEvent) => {
                const rect = this.canvas.getBoundingClientRect();
                const newMouseX = e.clientX - rect.left;
                const newMouseY = e.clientY - rect.top;
                
                const line = this.lines.find(l => l.id === this.draggedLineId);
                if (line && this.draggedLineEndpoint) {
                  const gridSize = this.gridSize;
                  const newGridX = Math.round(((newMouseX - this.offsetX) / this.zoom) / gridSize);
                  const newGridY = Math.round(((newMouseY - this.offsetY) / this.zoom) / gridSize);
                  
                  if (this.draggedLineEndpoint === 'start') {
                    line.gridX1 = newGridX;
                    line.gridY1 = newGridY;
                  } else {
                    line.gridX2 = newGridX;
                    line.gridY2 = newGridY;
                  }
                  this.render();
                }
              };
              
              const handleDocumentMouseUp = () => {
                document.removeEventListener('mousemove', handleDocumentMouseMove);
                document.removeEventListener('mouseup', handleDocumentMouseUp);
                
                if (this.isDraggingLineEndpoint && this.draggedLineId && this.onLineMoved) {
                  const line = this.lines.find(l => l.id === this.draggedLineId);
                  if (line) {
                    this.onLineMoved(line.id, line.gridX1, line.gridY1, line.gridX2, line.gridY2);
                  }
                }
                
                this.isDraggingLineEndpoint = false;
                this.draggedLineId = null;
                this.draggedLineEndpoint = null;
                this.canvas.style.cursor = 'grab';
              };
              
              document.addEventListener('mousemove', handleDocumentMouseMove);
              document.addEventListener('mouseup', handleDocumentMouseUp);
            }
            this.dragDelayTimer = null;
          }, 150);
          return;
        }

        // Start panning
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartOffsetX = this.offsetX;
        this.dragStartOffsetY = this.offsetY;
        this.canvas.style.cursor = 'grabbing';
        
        // Trigger background click callback (for closing sidebars, etc.)
        if (this.onBackgroundClick) {
          this.onBackgroundClick();
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Update menu hover state
      const previousHoveredOption = this.hoveredMenuOptionId;
      this.hoveredMenuOptionId = this.menu.getHoveredOption(mouseX, mouseY);
      
      // Trigger render if hover state changed
      if (previousHoveredOption !== this.hoveredMenuOptionId) {
        this.render();
      }
      
      // Update cursor based on hover state
      if (this.hoveredMenuOptionId !== null || this.menu.isClickingButton(mouseX, mouseY)) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'grab';
      }

      // Update branch hover tracking with grid positions
      if (this.branchInsertionMode) {
        const hoverResult = this.getClickedBranchInsertionPoint(mouseX, mouseY);
        if (hoverResult) {
          this.branchHoveredPoint = { 
            timelineId: hoverResult.timelineId, 
            position: hoverResult.gridPosition 
          };
        } else {
          this.branchHoveredPoint = { timelineId: null, position: -1 };
        }
        this.render();
      }

      // Update line hover tracking
      if (this.lineInsertionMode) {
        const gridSize = this.gridSize;
        const gridX = Math.round(((mouseX - this.offsetX) / this.zoom) / gridSize);
        const gridY = Math.round(((mouseY - this.offsetY) / this.zoom) / gridSize);
        this.lineHoveredPoint = { gridX, gridY };
        this.render();
      }

      if (this.isDragging) {
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        this.offsetX = this.dragStartOffsetX + deltaX;
        this.offsetY = this.dragStartOffsetY + deltaY;
        this.render();
      } else if (this.isDraggingTimeline && this.draggedTimelineId) {
        // Handle timeline dragging
        const deltaX = mouseX - this.timelineDragStartX;
        const deltaY = mouseY - this.timelineDragStartY;
        
        const timeline = this.timelines.find(t => t.id === this.draggedTimelineId);
        if (timeline) {
          // Convert screen delta to world delta
          const worldDeltaX = deltaX / this.zoom;
          const worldDeltaY = deltaY / this.zoom;
          
          // Update timeline position
          const newX = this.timelineOriginalX + worldDeltaX;
          const newY = this.timelineOriginalY + worldDeltaY;
          
          // Snap to grid (1 gridspace = 50 pixels)
          timeline.x = Math.round(newX / this.gridSize) * this.gridSize;
          timeline.y = Math.round(newY / this.gridSize) * this.gridSize;
          
          this.render();
        }
      } else if (this.isDraggingChapter && this.draggedChapterId && this.draggedChapterTimelineId) {
        // Handle chapter dragging
        const deltaX = mouseX - this.chapterDragStartX;
        
        const timeline = this.timelines.find(t => t.id === this.draggedChapterTimelineId);
        if (timeline && timeline.chapters) {
          const chapter = timeline.chapters.find(ch => ch.id === this.draggedChapterId);
          if (chapter) {
            // Convert screen delta to gridspace delta
            const chapterSegmentWidth = this.gridSize * this.zoom;
            const gridDelta = deltaX / chapterSegmentWidth;
            
            // Calculate new position relative to original
            let newX = this.chapterOriginalX + gridDelta;
            
            // Find Head and Tail chapters to determine bounds
            const headChapter = timeline.chapters.find(ch => ch.title === 'Head');
            const tailChapter = timeline.chapters.find(ch => ch.title === 'Tail');
            
            if (headChapter && tailChapter) {
              // Constrain between Head end and Tail start
              const minX = headChapter.x + headChapter.width;
              const maxX = tailChapter.x - chapter.width;
              newX = Math.max(minX, Math.min(maxX, newX));
            }
            
            // Update chapter position
            chapter.x = newX;
            
            // Update insertion point hover state for visual feedback
            this.hoveredInsertionPoint = this.getHoveredInsertionPoint(mouseX, mouseY);
            
            this.render();
          }
        }
      } else if (this.isDraggingArc && this.draggedArcId && this.draggedArcTimelineId) {
        // Handle arc dragging - update hover state for insertion between arcs
        this.hoveredArcInsertionPoint = this.getHoveredArcInsertionPoint(mouseX, mouseY);
        this.render();
      } else if (this.isDraggingTextbox && this.draggedTextboxId) {
        // Handle textbox dragging
        const deltaX = mouseX - this.textboxDragStartX;
        const deltaY = mouseY - this.textboxDragStartY;
        
        const textbox = this.textboxes.find(t => t.id === this.draggedTextboxId);
        if (textbox) {
          // Convert screen delta to world delta
          const worldDeltaX = deltaX / this.zoom;
          const worldDeltaY = deltaY / this.zoom;
          
          textbox.x = this.textboxOriginalX + worldDeltaX;
          textbox.y = this.textboxOriginalY + worldDeltaY;
          this.render();
        }
      } else if (this.isResizingTextbox) {
        // During active resize, keep cursor and hover stable
        this.canvas.style.cursor = this.resizeHandle ? this.getResizeCursor(this.resizeHandle) : 'grab';
        this.hoveredTextboxId = this.resizedTextboxId;
        // Do not update other hover states while resizing
      } else {
        // Handle insertion mode hover
        if (this.insertionMode) {
          const insertionPoint = this.getHoveredInsertionPoint(mouseX, mouseY);
          if (insertionPoint.timelineId !== this.hoveredInsertionPoint.timelineId ||
              insertionPoint.position !== this.hoveredInsertionPoint.position) {
            this.hoveredInsertionPoint = insertionPoint;
            this.render();
          }
          this.canvas.style.cursor = insertionPoint.position >= 0 ? 'crosshair' : 'not-allowed';
        } else if (this.branchInsertionMode) {
          // Handle branch insertion mode hover - use grid position
          const hoverResult = this.getClickedBranchInsertionPoint(mouseX, mouseY);
          const newHoverPoint = hoverResult 
            ? { timelineId: hoverResult.timelineId, position: hoverResult.gridPosition }
            : { timelineId: null, position: -1 };
            
          if (newHoverPoint.timelineId !== this.branchHoveredPoint.timelineId ||
              newHoverPoint.position !== this.branchHoveredPoint.position) {
            this.branchHoveredPoint = newHoverPoint;
            this.render();
          }
          
          // Validate cursor based on whether it's a valid point
          let isValid = newHoverPoint.position >= 0;
          if (isValid && this.branchFirstPoint) {
            // Second point - check if it's a different timeline
            isValid = newHoverPoint.timelineId !== this.branchFirstPoint.timelineId;
          }
          this.canvas.style.cursor = isValid ? 'crosshair' : 'not-allowed';
        } else {
          // Check hover states
          this.updateHoverState(mouseX, mouseY);
          
          // Check if hovering over a textbox
          const previousHoveredTextbox = this.hoveredTextboxId;
          this.hoveredTextboxId = this.isHoveringTextbox(mouseX, mouseY);
          
          // Trigger render if hover state changed
          if (previousHoveredTextbox !== this.hoveredTextboxId) {
            this.render();
          }
          
          // Check if hovering over textbox edge for resize cursor
          const textboxClickResult = this.getClickedTextboxElement(mouseX, mouseY);
          if (textboxClickResult?.type === 'resize-handle') {
            this.canvas.style.cursor = this.getResizeCursor(textboxClickResult.handle as string);
          } else {
            // Check if hovering over a branch
            const hoveredBranchId = this.getClickedBranch(mouseX, mouseY);
            
            // Check if hovering over draggable timeline element
            const draggableElement = this.isDraggableTimelineElement(mouseX, mouseY);
            if (draggableElement?.isDraggable) {
              this.canvas.style.cursor = 'move';
            } else if (hoveredBranchId) {
              this.canvas.style.cursor = 'pointer';
            } else if (this.isClickingMenuButton(mouseX, mouseY)) {
              this.canvas.style.cursor = 'pointer';
            } else {
              this.canvas.style.cursor = 'grab';
            }
          }
        }
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      // Clear any pending drag
      if (this.dragDelayTimer) {
        clearTimeout(this.dragDelayTimer);
        this.dragDelayTimer = null;
        this.pendingDragTimelineId = null;
        this.pendingDragChapterId = null;
        this.pendingDragArcId = null;
        this.pendingDragTextboxId = null;
        this.pendingDragLineId = null;
        this.pendingDragLineEndpointLineId = null;
        this.pendingDragLineEndpoint = null;
      }
      
      // Save timeline position if we were dragging a timeline
      if (this.isDraggingTimeline && this.draggedTimelineId && this.onTimelineMoved) {
        const timeline = this.timelines.find(t => t.id === this.draggedTimelineId);
        if (timeline) {
          this.onTimelineMoved(timeline.id, timeline.x, timeline.y);
        }
      }
      
      // Save arc position if we were dragging an arc
      if (this.isDraggingArc && this.draggedArcId && this.draggedArcTimelineId && this.onReorderArc) {
        // Use the hovered arc insertion point to determine where to place the arc
        if (this.hoveredArcInsertionPoint.timelineId && this.hoveredArcInsertionPoint.position >= 0) {
          // Pass the full arc group position (including unassigned chapters)
          // The state manager will handle building the same groups and inserting at this position
          this.onReorderArc(this.draggedArcTimelineId, this.draggedArcId, this.hoveredArcInsertionPoint.position);
        }
      }
      
      // Save chapter position if we were dragging a chapter
      if (this.isDraggingChapter && this.draggedChapterId && this.draggedChapterTimelineId && this.onReorderChapter) {
        // Use the hovered insertion point to determine where to place the chapter
        if (this.hoveredInsertionPoint.timelineId && this.hoveredInsertionPoint.position >= 0) {
          const timeline = this.timelines.find(t => t.id === this.hoveredInsertionPoint.timelineId);
          if (timeline && timeline.chapters && this.hoveredInsertionPoint.position < timeline.chapters.length) {
            // The position already accounts for Head/Tail, so we can use it directly
            // Subtract 1 because position includes the Head chapter
            const targetIndex = this.hoveredInsertionPoint.position - 1;
            this.onReorderChapter(this.draggedChapterTimelineId, this.draggedChapterId, targetIndex);
          }
        } else {
          // Invalid drop location - reset chapter positions by re-syncing from state
          const state = this.getStateChaptersForTimeline?.(this.draggedChapterTimelineId);
          if (state) {
            this.updateTimelineChapters(this.draggedChapterTimelineId, state);
          }
        }
      }
      
      // Save textbox position if we were dragging a textbox
      if (this.isDraggingTextbox && this.draggedTextboxId && this.onTextboxMoved) {
        const textbox = this.textboxes.find(t => t.id === this.draggedTextboxId);
        if (textbox) {
          this.onTextboxMoved(textbox.id, textbox.x, textbox.y);
        }
      }
      
      // Save textbox dimensions if we were resizing a textbox
      if (this.isResizingTextbox && this.resizedTextboxId && this.onTextboxResized) {
        const textbox = this.textboxes.find(t => t.id === this.resizedTextboxId);
        if (textbox) {
          this.onTextboxResized(textbox.id, textbox.width, textbox.height);
        }
      }
      
      this.isDragging = false;
      this.isDraggingTimeline = false;
      this.isDraggingChapter = false;
      this.isDraggingArc = false;
      this.isDraggingTextbox = false;
      this.isResizingTextbox = false;
      this.draggedChapterId = null;
      this.draggedChapterTimelineId = null;
      this.draggedArcId = null;
      this.draggedArcTimelineId = null;
      this.draggedTextboxId = null;
      this.resizedTextboxId = null;
      this.hoveredInsertionPoint = { timelineId: null, position: -1 };
      this.hoveredArcInsertionPoint = { timelineId: null, position: -1 };
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.isDraggingTimeline = false;
      this.isDraggingChapter = false;
      this.isDraggingArc = false;
      this.isDraggingTextbox = false;
      this.isResizingTextbox = false;
      this.draggedTimelineId = null;
      this.draggedChapterId = null;
      this.draggedChapterTimelineId = null;
      this.draggedArcId = null;
      this.draggedArcTimelineId = null;
      this.draggedTextboxId = null;
      this.resizedTextboxId = null;
      this.canvas.style.cursor = 'grab';
      this.hoveredInsertZone = { timelineId: null, position: 'below' };
      this.hoveredInsertionPoint = { timelineId: null, position: -1 };
      this.hoveredArcInsertionPoint = { timelineId: null, position: -1 };
      if (this.onTimelineHovered) {
        this.onTimelineHovered(null, 'below');
      }
      this.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
      this.menuCanvas.width = this.container.clientWidth;
      this.menuCanvas.height = this.container.clientHeight;
      this.render();
    });
  }

  // Viewport getters/setters to preserve camera state across UI re-renders
  getViewport(): { offsetX: number; offsetY: number; zoom: number } {
    return { offsetX: this.offsetX, offsetY: this.offsetY, zoom: this.zoom };
  }

  setViewport(view: { offsetX: number; offsetY: number; zoom: number }): void {
    this.offsetX = view.offsetX;
    this.offsetY = view.offsetY;
    this.zoom = view.zoom;
    this.render();
  }

  centerOnTimeline(timelineId: string): void {
    this.smoothCenterOnTimeline(timelineId);
  }

  private smoothCenterOnTimeline(timelineId: string): void {
    const timeline = this.timelines.find(t => t.id === timelineId);
    if (!timeline) return;

    // Calculate the target offset to center the timeline
    const timelineWorldX = timeline.x;
    const timelineWorldY = timeline.y;
    const timelineWorldWidth = timeline.width;
    
    // Center the timeline in the viewport
    const targetOffsetX = this.canvas.width / 2 - (timelineWorldX + timelineWorldWidth / 2) * this.zoom;
    const targetOffsetY = this.canvas.height / 2 - timelineWorldY * this.zoom;

    // Start the animation
    this.centeringStartOffset = { x: this.offsetX, y: this.offsetY };
    this.centeringTargetOffset = { x: targetOffsetX, y: targetOffsetY };
    this.centeringStartTime = Date.now();
    this.isCentering = true;
  }

  private updateHoverState(mouseX: number, mouseY: number): void {
    let foundHover = false;

    // Check insert zones (above and below timelines)
    for (let i = 0; i < this.timelines.length; i++) {
      const timeline = this.timelines[i];
      const worldY = timeline.y;
      const screenY = worldY * this.zoom + this.offsetY;
      const insertZoneHeight = 30;

      // Check above
      if (
        mouseX >= 0 &&
        mouseX <= this.canvas.width &&
        screenY - insertZoneHeight < mouseY &&
        mouseY < screenY
      ) {
        this.hoveredInsertZone = { timelineId: timeline.id, position: 'above' };
        if (this.onTimelineHovered) {
          this.onTimelineHovered(timeline.id, 'above');
        }
        foundHover = true;
        this.render();
        return;
      }

      // Check below
      const screenBelowY = screenY + 20;
      if (
        mouseX >= 0 &&
        mouseX <= this.canvas.width &&
        screenBelowY < mouseY &&
        mouseY < screenBelowY + insertZoneHeight
      ) {
        this.hoveredInsertZone = { timelineId: timeline.id, position: 'below' };
        if (this.onTimelineHovered) {
          this.onTimelineHovered(timeline.id, 'below');
        }
        foundHover = true;
        this.render();
        return;
      }
    }

    if (!foundHover && this.hoveredInsertZone.timelineId !== null) {
      this.hoveredInsertZone = { timelineId: null, position: 'below' };
      if (this.onTimelineHovered) {
        this.onTimelineHovered(null, 'below');
      }
      this.render();
    }
  }

  private isHoveringTextbox(mouseX: number, mouseY: number): string | null {
    // Check each textbox to see if mouse is hovering over it
    for (const textbox of this.textboxes) {
      const screenX = textbox.x * this.zoom + this.offsetX;
      const screenY = textbox.y * this.zoom + this.offsetY;
      const screenWidth = textbox.width * this.zoom;
      const screenHeight = textbox.height * this.zoom;
      
      // Check if mouse is within textbox bounds
      if (
        mouseX >= screenX &&
        mouseX <= screenX + screenWidth &&
        mouseY >= screenY &&
        mouseY <= screenY + screenHeight
      ) {
        return textbox.id;
      }
    }
    return null;
  }

  private isClickingMenuButton(mouseX: number, mouseY: number): boolean {
    // Deprecated - use this.menu.isClickingButton() instead
    return this.menu.isClickingButton(mouseX, mouseY);
  }

  addTimeline(id: string, name: string = 'Timeline', x?: number, y?: number): void {
    // Use provided positions, default to 0 if not provided (for backwards compatibility)
    const xPosition = x !== undefined ? x : 0;
    const yPosition = y !== undefined ? y : 0;
    
    // Initialize with head and tail chapters (2 units each)
    const headChapter: TimelineChapter = {
      id: `${id}-head`,
      title: 'Head',
      x: 0,
      width: 1
    };
    
    const tailChapter: TimelineChapter = {
      id: `${id}-tail`,
      title: 'Tail',
      x: 1,
      width: 1
    };
    
    this.timelines.push({
      id,
      name,
      x: xPosition,
      y: yPosition,
      width: 100, // 2 gridspaces * 50px per gridspace
      height: this.timelineHeight,
      chapters: [headChapter, tailChapter]
    });
    
    this.render();
  }

  removeTimeline(id: string): void {
    this.timelines = this.timelines.filter(t => t.id !== id);
    // Recalculate positions
    this.timelines.forEach((t, i) => {
      t.y = i * (this.timelineHeight + this.gridSize * 2);
    });
    this.render();
  }

  setOnAddTimeline(callback: () => void): void {
    this.onAddTimeline = callback;
  }

  setOnAddChapter(callback: (timelineId: string, position: number) => void): void {
    this.onAddChapter = callback;
  }

  setOnAddBranch(callback: (startTimelineId: string, startPosition: number, endTimelineId: string, endPosition: number) => void): void {
    this.onAddBranch = callback;
  }

  setOnEditTimeline(callback: (timelineId: string) => void): void {
    this.onEditTimeline = callback;
  }

  setOnEditChapter(callback: (chapterId: string) => void): void {
    this.onEditChapter = callback;
  }

  setOnEditBranch(callback: (branchId: string) => void): void {
    this.onEditBranch = callback;
  }

  setOnReorderChapter(callback: (timelineId: string, chapterId: string, newPosition: number) => void): void {
    this.onReorderChapter = callback;
  }

  setOnReorderArc(callback: (timelineId: string, arcId: string, newPosition: number) => void): void {
    this.onReorderArc = callback;
  }

  setOnTimelineHovered(callback: (timelineId: string | null, position: 'above' | 'below') => void): void {
    this.onTimelineHovered = callback;
  }

  setOnTimelineMoved(callback: (timelineId: string, x: number, y: number) => void): void {
    this.onTimelineMoved = callback;
  }

  setOnBackgroundClick(callback: () => void): void {
    this.onBackgroundClick = callback;
  }

  setGetStateChaptersCallback(callback: (timelineId: string) => any[]): void {
    this.getStateChaptersForTimeline = callback;
  }

  setOnAddTextbox(callback: (x: number, y: number) => void): void {
    this.onAddTextbox = callback;
  }

  setOnEditTextbox(callback: (textboxId: string) => void): void {
    this.onEditTextbox = callback;
  }

  setOnTextboxMoved(callback: (textboxId: string, x: number, y: number) => void): void {
    this.onTextboxMoved = callback;
  }

  setOnTextboxResized(callback: (textboxId: string, width: number, height: number) => void): void {
    this.onTextboxResized = callback;
  }

  setOnAddLine(callback: (gridX1: number, gridY1: number, gridX2: number, gridY2: number) => void): void {
    this.onAddLine = callback;
  }

  setOnEditLine(callback: (lineId: string) => void): void {
    this.onEditLine = callback;
  }

  setOnLineMoved(callback: (lineId: string, gridX1: number, gridY1: number, gridX2: number, gridY2: number) => void): void {
    this.onLineMoved = callback;
  }

  setTextboxes(textboxes: any[]): void {
    this.textboxes = textboxes;
    this.render();
  }

  setLines(lines: any[]): void {
    this.lines = lines;
    this.render();
  }

  toggleInsertionMode(): void {
    this.insertionMode = !this.insertionMode;
    this.hoveredInsertionPoint = { timelineId: null, position: -1 };
    this.render();
  }

  toggleBranchInsertionMode(): void {
    this.branchInsertionMode = !this.branchInsertionMode;
    this.branchFirstPoint = null;
    this.branchHoveredPoint = { timelineId: null, position: -1 };
    this.render();
  }

  toggleLineInsertionMode(): void {
    this.lineInsertionMode = !this.lineInsertionMode;
    this.lineFirstPoint = null;
    this.lineHoveredPoint = null;
    this.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Export the currently rendered view to a PNG download
   */
  exportToPNG(filename: string = 'timeline.png'): void {
    // Compute world bounds of all drawable objects
    const bounds = this.computeContentBounds();
    if (!bounds) return;

    const padding = this.gridSize * 2; // 2 gridspaces of padding
    const exportWidth = Math.ceil(bounds.width + padding * 2);
    const exportHeight = Math.ceil(bounds.height + padding * 2);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Save current viewport/state
    const originalCanvas = this.canvas;
    const originalCtx = this.ctx;
    const originalOffsetX = this.offsetX;
    const originalOffsetY = this.offsetY;
    const originalZoom = this.zoom;
    const originalSuppressMenuRender = this.suppressMenuRender;
    const wasMenuOpen = this.menu.isOpen();
    const originalSuppressTextboxRender = this.suppressTextboxRender;

    // Switch to offscreen rendering context
    this.canvas = tempCanvas;
    this.ctx = tempCtx;

    // Position viewport so all content fits with padding
    this.zoom = 1;
    this.offsetX = padding - bounds.minX;
    this.offsetY = padding - bounds.minY;

    // Hide menu while exporting
    this.suppressMenuRender = true;
    this.suppressTextboxRender = true; // we'll draw textboxes directly onto the offscreen ctx
    this.menu.close();

    // Render onto the offscreen canvas
    this.render();

    // Render textboxes directly onto the offscreen canvas (since DOM overlay is suppressed)
    this.renderTextboxesToCanvas(tempCtx);

    // Restore original state
    this.canvas = originalCanvas;
    this.ctx = originalCtx;
    this.offsetX = originalOffsetX;
    this.offsetY = originalOffsetY;
    this.zoom = originalZoom;
    this.suppressMenuRender = originalSuppressMenuRender;
    this.suppressTextboxRender = originalSuppressTextboxRender;
    if (wasMenuOpen) {
      this.menu.open();
    }

    // Export PNG
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  getZoom(): number {
    return this.zoom;
  }

  getOffsetX(): number {
    return this.offsetX;
  }

  getOffsetY(): number {
    return this.offsetY;
  }

  setBranches(branches: any[]): void {
    this.branches = branches;
    this.render();
  }

  /**
   * Calculate world-space bounds of timelines, chapters, textboxes, lines, and branches
   */
  private computeContentBounds(): { minX: number; minY: number; width: number; height: number } | null {
    if (this.timelines.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const chapterSegmentWidth = this.gridSize; // world units (pixels in world space)

    // Timelines and chapters
    this.timelines.forEach((timeline) => {
      // Include timeline title width to the left
      const titleWidth = this.ctx.measureText(timeline.name || '').width + 30; // gap + small buffer

      // Timeline base point and label space (tighter vertical padding)
      minX = Math.min(minX, timeline.x - titleWidth);
      minY = Math.min(minY, timeline.y - 50); // room for arc titles/ticks
      maxY = Math.max(maxY, timeline.y + 50); // room for ticks/arrow

      if (timeline.chapters && timeline.chapters.length > 0) {
        const lastChapter = timeline.chapters[timeline.chapters.length - 1];
        const tailEnd = (lastChapter.x + lastChapter.width) * chapterSegmentWidth;
        maxX = Math.max(maxX, timeline.x + tailEnd + 40); // room for arrow
      } else {
        maxX = Math.max(maxX, timeline.x + timeline.width);
      }
    });

    // Textboxes
    this.textboxes.forEach((tb) => {
      minX = Math.min(minX, tb.x);
      minY = Math.min(minY, tb.y);
      maxX = Math.max(maxX, tb.x + tb.width);
      maxY = Math.max(maxY, tb.y + tb.height);
    });

    // Lines (grid-based)
    this.lines.forEach((line) => {
      const x1 = line.gridX1 * this.gridSize;
      const y1 = line.gridY1 * this.gridSize;
      const x2 = line.gridX2 * this.gridSize;
      const y2 = line.gridY2 * this.gridSize;
      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    });

    // Branches (world units already)
    this.branches.forEach((branch) => {
      const startTimeline = this.timelines.find((t) => t.id === branch.startContinuityId);
      const endTimeline = this.timelines.find((t) => t.id === branch.endContinuityId);
      if (!startTimeline || !endTimeline) return;

      const startX = startTimeline.x + branch.startPosition * chapterSegmentWidth;
      const startY = startTimeline.y;
      const endX = endTimeline.x + branch.endPosition * chapterSegmentWidth;
      const endY = endTimeline.y;

      minX = Math.min(minX, startX, endX);
      minY = Math.min(minY, startY, endY);
      maxX = Math.max(maxX, startX, endX);
      maxY = Math.max(maxY, startY, endY);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Render textboxes directly onto a canvas (used for PNG export)
   */
  private renderTextboxesToCanvas(ctx: CanvasRenderingContext2D): void {
    const padding = 8;
    this.textboxes.forEach((tb) => {
      const screenX = tb.x * this.zoom + this.offsetX;
      const screenY = tb.y * this.zoom + this.offsetY;
      const width = tb.width * this.zoom;
      const height = tb.height * this.zoom;

      // Text only (no background or outline)
      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX, screenY, width, height);
      ctx.clip();

      const fontSize = tb.fontSize * this.zoom;
      const lineHeight = tb.fontSize * 1.4 * this.zoom;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = '#222';
      ctx.textBaseline = 'top';

      const maxTextWidth = width - padding * 2;
      const alignX = tb.alignX || 'left';
      const alignY = tb.alignY || 'top';

      const raw = (tb.content || '').replace(/\r\n/g, '\n');
      const paragraphs = raw.split('\n');

      // Lay out lines first to compute total height for vertical alignment
      const lines: string[] = [];
      const measureLine = (text: string) => ctx.measureText(text).width;
      for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (measureLine(test) <= maxTextWidth) {
            line = test;
          } else {
            if (line) lines.push(line);
            line = word;
          }
        }
        if (line) lines.push(line);
        // Paragraph break marker as empty string to add spacing later
        lines.push('');
      }
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop(); // remove trailing spacer
      }

      const paragraphGap = lineHeight * 0.3;
      let contentHeight = 0;
      lines.forEach((text) => {
        contentHeight += text === '' ? paragraphGap : lineHeight;
      });

      const availableHeight = height - padding * 2;
      let y = screenY + padding;
      if (alignY === 'middle') {
        y = screenY + padding + Math.max(0, (availableHeight - contentHeight) / 2);
      } else if (alignY === 'bottom') {
        y = screenY + padding + Math.max(0, availableHeight - contentHeight);
      }

      for (const text of lines) {
        if (text === '') {
          y += paragraphGap;
          continue;
        }
        this.drawAlignedText(ctx, text, screenX, width, y, alignX as 'left' | 'center' | 'right', padding);
        y += lineHeight;
      }

      ctx.restore();
    });
  }

  private drawAlignedText(ctx: CanvasRenderingContext2D, text: string, boxX: number, boxWidth: number, y: number, align: 'left' | 'center' | 'right', padding: number): void {
    let x = boxX + padding;
    if (align === 'center') {
      ctx.textAlign = 'center';
      x = boxX + boxWidth / 2;
    } else if (align === 'right') {
      ctx.textAlign = 'right';
      x = boxX + boxWidth - padding;
    } else {
      ctx.textAlign = 'left';
      x = boxX + padding;
    }
    ctx.fillText(text, x, y);
  }

  updateTimelineArcs(timelineId: string, arcs: any[]): void {
    this.timelineArcs.set(timelineId, arcs);
    this.render();
  }

  updateTimelineChaptersWithArcs(timelineId: string, chapters: any[], arcs: any[]): void {
    this.updateTimelineArcs(timelineId, arcs);
    this.updateTimelineChapters(timelineId, chapters);
  }

  /**
   * Update chapters for a timeline from state data
   * Converts Chapter model into TimelineChapter visualization
   */
  updateTimelineChapters(timelineId: string, chapters: any[]): void {
    const timeline = this.timelines.find(t => t.id === timelineId);
    if (!timeline) return;

    // Keep head and tail chapters, reconstruct middle chapters
    const headChapter = timeline.chapters?.find(ch => ch.title === 'Head');
    const tailChapter = timeline.chapters?.find(ch => ch.title === 'Tail');

    const visualChapters: TimelineChapter[] = [];
    
    if (headChapter) visualChapters.push(headChapter);

    // Convert state chapters to visual chapters
    // Sort by timestamp to maintain order
    const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);
    
    let currentX = 1; // Position after head
    sortedChapters.forEach((chapter) => {
      // Calculate width: use manual gridLength if set (>0), otherwise auto-calculate
      let chapterWidth: number;
      if (chapter.gridLength && chapter.gridLength > 0) {
        chapterWidth = chapter.gridLength;
      } else {
        // Auto-calculate based on title length
        // Use divisor of 5 instead of 6 to prefer slightly longer width when close
        chapterWidth = Math.max(1, Math.ceil(chapter.title.length / 5));
      }
      
      const visualChapter: TimelineChapter = {
        id: chapter.id,
        title: chapter.title,
        x: currentX,
        width: chapterWidth,
        arcId: chapter.arcId
      };
      visualChapters.push(visualChapter);
      currentX += chapterWidth;
    });

    if (tailChapter) {
      // Update tail position to be after all chapters
      const lastChapterEnd = visualChapters.length > 0 
        ? visualChapters[visualChapters.length - 1].x + visualChapters[visualChapters.length - 1].width
        : 2;
      tailChapter.x = lastChapterEnd;
      visualChapters.push(tailChapter);
    }

    timeline.chapters = visualChapters;
    this.render();
  }

  private render(): void {
    // Update centering animation
    if (this.isCentering) {
      const elapsed = Date.now() - this.centeringStartTime;
      const progress = Math.min(1, elapsed / this.centeringDuration);
      
      // Ease out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      this.offsetX = this.centeringStartOffset.x + 
        (this.centeringTargetOffset.x - this.centeringStartOffset.x) * easedProgress;
      this.offsetY = this.centeringStartOffset.y + 
        (this.centeringTargetOffset.y - this.centeringStartOffset.y) * easedProgress;
      
      if (progress >= 1) {
        this.isCentering = false;
        this.offsetX = this.centeringTargetOffset.x;
        this.offsetY = this.centeringTargetOffset.y;
      }
    }
    
    // Update menu animation
    const menuAnimating = this.menu.update();
    
    // Update animation running state based on menu and other animations
    this.animationRunning = menuAnimating || this.isCentering;

    // Clear canvas with light background
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid (optional visual aid)
    this.drawGrid();

    // Draw timelines
    this.drawTimelines();

    // Draw lines
    this.drawLines();

    // Draw textboxes (skip DOM overlay when suppressed, e.g., offscreen export)
    if (!this.suppressTextboxRender) {
      this.drawTextboxes();
    }

    // Draw menu on separate canvas unless suppressed (e.g., during PNG export)
    if (!this.suppressMenuRender) {
      this.renderMenuCanvas();
    }
  }

  private renderMenuCanvas(): void {
    // Clear menu canvas
    this.menuCtx.clearRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);
    // Render menu to menu canvas
    this.menu.render(this.menuCtx, this.menuCanvas.height, this.hoveredMenuOptionId);
  }

  private drawGrid(): void {
    const gridSize = 50;
    const dotRadius = 2.5;
    const dotColor = 'rgba(150, 150, 150, 0.6)';
    
    this.ctx.fillStyle = dotColor;

    // Draw dots in a grid pattern
    const startX = Math.floor((-this.offsetX) / (gridSize * this.zoom)) * gridSize;
    const endX = startX + Math.ceil((this.canvas.width / this.zoom + gridSize));
    
    const startY = Math.floor((-this.offsetY) / (gridSize * this.zoom)) * gridSize;
    const endY = startY + Math.ceil((this.canvas.height / this.zoom + gridSize));
    
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        const screenX = x * this.zoom + this.offsetX;
        const screenY = y * this.zoom + this.offsetY;
        
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawTimelines(): void {
    // Always use arc mode rendering
    this.drawTimelinesArcMode();

    // Draw branches
    this.drawBranches();

    // Draw insertion mode indicators
    if (this.insertionMode || this.isDraggingChapter) {
      this.drawInsertionIndicators();
    }

    // Draw branch insertion mode indicators
    if (this.branchInsertionMode) {
      this.drawBranchInsertionIndicators();
    }
  }

  /**
   * Check if a branch starts at the end of a timeline (no more chapters after)
   * If so, the tail should be hidden and replaced by the branch as the "tail"
   */
  private shouldHideTailForTimeline(timelineId: string): boolean {
    // Find the timeline
    const timeline = this.timelines.find(t => t.id === timelineId);
    if (!timeline || !timeline.chapters) return false;

    // Find the last real chapter (not Tail)
    let lastRealChapterIndex = -1;
    for (let i = timeline.chapters.length - 1; i >= 0; i--) {
      if (timeline.chapters[i].title !== 'Tail') {
        lastRealChapterIndex = i;
        break;
      }
    }

    if (lastRealChapterIndex === -1) return false; // No real chapters

    const lastRealChapter = timeline.chapters[lastRealChapterIndex];
    const endPosition = lastRealChapter.x + lastRealChapter.width;

    // Check if any branch starts at this position
    for (const branch of this.branches) {
      if (branch.startContinuityId === timelineId && 
          Math.round(branch.startPosition) === Math.round(endPosition)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a branch ends at the start of a timeline (first insertion point)
   * If so, the head should be hidden and replaced by the branch as the "head"
   */
  private shouldHideHeadForTimeline(timelineId: string): boolean {
    // Check if any branch ends at position 1 (first insertion point, after Head which is at 0-1)
    for (const branch of this.branches) {
      if (branch.endContinuityId === timelineId && 
          Math.round(branch.endPosition) === 1) {
        return true;
      }
    }

    return false;
  }

  private drawTimelinesArcMode(): void {
    this.timelines.forEach(timeline => {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;
      const arcs = this.timelineArcs.get(timeline.id) || [];

      // Group chapters by arc (keeping them in order and grouping adjacent chapters)
      // Chapters without an arc are treated as individual groups
      const arcGroups: Array<{ arcId: string; chapters: TimelineChapter[] }> = [];
      if (timeline.chapters) {
        let currentArcId: string | null = null;
        let currentGroup: TimelineChapter[] = [];
        
        timeline.chapters.forEach(chapter => {
          if (chapter.title === 'Head' || chapter.title === 'Tail') return;
          
          // Each unassigned chapter is its own group (use chapter ID as unique arcId)
          const arcId = chapter.arcId || `unassigned-${chapter.id}`;
          
          if (arcId !== currentArcId) {
            // New arc group
            if (currentGroup.length > 0) {
              arcGroups.push({ arcId: currentArcId!, chapters: currentGroup });
            }
            currentArcId = arcId;
            currentGroup = [chapter];
          } else {
            // Same arc, add to current group
            currentGroup.push(chapter);
          }
        });
        
        // Add the last group
        if (currentGroup.length > 0 && currentArcId) {
          arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
        }
      }

      // Draw horizontal timeline line segments colored by arc
      // First, draw the head section in black (from timeline start to first chapter or tail)
      // But skip if a branch ends at the start position
      const shouldHideHeadArcMode = this.shouldHideHeadForTimeline(timeline.id);
      if (!shouldHideHeadArcMode && timeline.chapters && timeline.chapters.length > 0) {
        const firstRealChapter = timeline.chapters.find(ch => ch.title !== 'Head' && ch.title !== 'Tail');
        if (firstRealChapter) {
          const headEndX = screenX + (firstRealChapter.x * chapterSegmentWidth);
          this.ctx.strokeStyle = '#333333';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(screenX, screenY);
          this.ctx.lineTo(headEndX, screenY);
          this.ctx.stroke();
        } else {
          // No real chapters, draw from start to tail
          const tailChapter = timeline.chapters[timeline.chapters.length - 1];
          if (tailChapter) {
            const headEndX = screenX + (tailChapter.x * chapterSegmentWidth);
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(headEndX, screenY);
            this.ctx.stroke();
          }
        }
      }

      // Draw arc-colored segments
      arcGroups.forEach(group => {
        const arc = arcs.find(a => a.id === group.arcId);
        const arcColor = arc?.color || '#333333';
        
        if (group.chapters.length > 0) {
          const firstChapter = group.chapters[0];
          const lastChapter = group.chapters[group.chapters.length - 1];
          
          const startX = screenX + (firstChapter.x * chapterSegmentWidth);
          const endX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
          
          this.ctx.strokeStyle = arcColor;
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(startX, screenY);
          this.ctx.lineTo(endX, screenY);
          this.ctx.stroke();
        }
      });

      // Draw the tail section in black (from last chapter to tail)
      // But hide if a branch starts at the end position
      const shouldHideTail = this.shouldHideTailForTimeline(timeline.id);
      
      if (!shouldHideTail && timeline.chapters && timeline.chapters.length > 0) {
        const lastRealChapter = [...timeline.chapters].reverse().find(ch => ch.title !== 'Head' && ch.title !== 'Tail');
        const tailChapter = timeline.chapters[timeline.chapters.length - 1];
        if (lastRealChapter && tailChapter) {
          const tailStartX = screenX + ((lastRealChapter.x + lastRealChapter.width) * chapterSegmentWidth);
          const tailEndX = screenX + ((tailChapter.x + tailChapter.width) * chapterSegmentWidth);
          this.ctx.strokeStyle = '#333333';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(tailStartX, screenY);
          this.ctx.lineTo(tailEndX, screenY);
          this.ctx.stroke();
        } else if (tailChapter) {
          // No real chapters, tail section already drawn as part of head
          // Just draw the tail chapter itself
          const tailStartX = screenX + (tailChapter.x * chapterSegmentWidth);
          const tailEndX = screenX + ((tailChapter.x + tailChapter.width) * chapterSegmentWidth);
          this.ctx.strokeStyle = '#333333';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(tailStartX, screenY);
          this.ctx.lineTo(tailEndX, screenY);
          this.ctx.stroke();
        }
      }

      // Draw chapters with black tick marks
      if (timeline.chapters) {
        timeline.chapters.forEach(chapter => {
          if (chapter.title === 'Head' || chapter.title === 'Tail') return;
          
          const chapterScreenX = screenX + (chapter.x * chapterSegmentWidth);
          const chapterScreenWidth = chapter.width * chapterSegmentWidth;
          const tickHeight = 8;
          
          // Draw tick marks in black
          this.ctx.strokeStyle = '#333333';
          this.ctx.lineWidth = 2;
          
          // Start tick
          this.ctx.beginPath();
          this.ctx.moveTo(chapterScreenX, screenY - tickHeight);
          this.ctx.lineTo(chapterScreenX, screenY + tickHeight);
          this.ctx.stroke();
          
          // End tick
          this.ctx.beginPath();
          this.ctx.moveTo(chapterScreenX + chapterScreenWidth, screenY - tickHeight);
          this.ctx.lineTo(chapterScreenX + chapterScreenWidth, screenY + tickHeight);
          this.ctx.stroke();
          
          // Draw chapter title above the timeline (stays black)
          this.ctx.fillStyle = '#333333';
          this.ctx.font = '12px sans-serif';
          this.ctx.textBaseline = 'bottom';
          this.ctx.textAlign = 'center';
          
          const maxTextWidth = chapterScreenWidth - 4;
          const textX = chapterScreenX + chapterScreenWidth / 2;
          const textY = screenY - tickHeight - 4;
          
          let displayText = chapter.title;
          const metrics = this.ctx.measureText(displayText);
          if (metrics.width > maxTextWidth) {
            while (displayText.length > 0 && this.ctx.measureText(displayText + '...').width > maxTextWidth) {
              displayText = displayText.slice(0, -1);
            }
            displayText += '...';
          }
          this.ctx.fillText(displayText, textX, textY);
        });
      }

      // Draw arc group titles
      arcGroups.forEach(group => {
        const arc = arcs.find(a => a.id === group.arcId);
        if (!arc || group.chapters.length === 0) return;

        // Find the range of this arc group
        const firstChapter = group.chapters[0];
        const lastChapter = group.chapters[group.chapters.length - 1];
        
        const startX = screenX + (firstChapter.x * chapterSegmentWidth);
        const endX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
        const centerX = (startX + endX) / 2;
        
        // Darken arc color by 50% brightness
        const darkenedColor = this.darkenColor(arc.color, 0.5);
        
        // Draw arc title centered above the arc group
        this.ctx.fillStyle = darkenedColor;
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textBaseline = 'bottom';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(arc.name, centerX, screenY - 28);
      });

      // Draw arrow at the end (unless tail is hidden by a branch)
      const shouldHideTailArc = this.shouldHideTailForTimeline(timeline.id);
      
      if (!shouldHideTailArc) {
        const arrowSize = 12;
        let arrowStartX = screenX;
        let arrowEndX = screenX;
        
        if (timeline.chapters && timeline.chapters.length > 0) {
          const lastChapter = timeline.chapters[timeline.chapters.length - 1];
          arrowStartX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
          arrowEndX = arrowStartX + 20;
        }
        
        const arrowY = screenY;
        
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowStartX, arrowY);
        this.ctx.lineTo(arrowEndX - arrowSize, arrowY);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        this.ctx.moveTo(arrowEndX, arrowY);
        this.ctx.lineTo(arrowEndX - arrowSize, arrowY - arrowSize / 2);
        this.ctx.lineTo(arrowEndX - arrowSize, arrowY + arrowSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
      }

      // Draw arc insertion point indicators if dragging an arc
      if (this.isDraggingArc && timeline.id === this.draggedArcTimelineId) {
        // Find the arc groups for this timeline to determine insertion points
        const arcGroups: { arcId: string; chapters: any[] }[] = [];
        
        if (timeline.chapters) {
          let currentArcId: string | null = null;
          let currentGroup: any[] = [];

          timeline.chapters.forEach(chapter => {
            if (chapter.title === 'Head' || chapter.title === 'Tail') return;
            
            // Each unassigned chapter is its own group
            const arcId = chapter.arcId || `unassigned-${chapter.id}`;
            
            if (arcId !== currentArcId) {
              if (currentGroup.length > 0) {
                arcGroups.push({ arcId: currentArcId!, chapters: currentGroup });
              }
              currentArcId = arcId;
              currentGroup = [chapter];
            } else {
              currentGroup.push(chapter);
            }
          });

          if (currentGroup.length > 0 && currentArcId) {
            arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
          }
        }

        // Draw all insertion points between arc groups (red/green like chapters)
        for (let i = 0; i < arcGroups.length; i++) {
          const group = arcGroups[i];
          const lastChapter = group.chapters[group.chapters.length - 1];
          const insertionX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
          
          const isHovered = this.hoveredArcInsertionPoint.timelineId === timeline.id &&
                           this.hoveredArcInsertionPoint.position === i + 1;
          
          // Don't show indicator right after the dragged arc
          const draggedArcIndex = arcGroups.findIndex(g => g.arcId === this.draggedArcId);
          if (draggedArcIndex !== -1 && (i === draggedArcIndex || i === draggedArcIndex - 1)) {
            continue;
          }
          
          // Red by default, green when hovered
          this.ctx.fillStyle = isHovered ? '#00dd00' : 'rgba(220, 0, 0, 0.6)';
          this.ctx.strokeStyle = isHovered ? '#00aa00' : 'rgba(180, 0, 0, 0.8)';
          
          this.ctx.beginPath();
          this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
          this.ctx.fill();
          
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        
        // Also draw before first arc group (position 0)
        if (arcGroups.length > 0) {
          const firstGroup = arcGroups[0];
          const firstChapter = firstGroup.chapters[0];
          const insertionX = screenX + (firstChapter.x * chapterSegmentWidth);
          
          const isHovered = this.hoveredArcInsertionPoint.timelineId === timeline.id &&
                           this.hoveredArcInsertionPoint.position === 0;
          
          const draggedArcIndex = arcGroups.findIndex(g => g.arcId === this.draggedArcId);
          if (draggedArcIndex !== 0) {
            this.ctx.fillStyle = isHovered ? '#00dd00' : 'rgba(220, 0, 0, 0.6)';
            this.ctx.strokeStyle = isHovered ? '#00aa00' : 'rgba(180, 0, 0, 0.8)';
            
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
            this.ctx.stroke();
          }
        }
      }

      // Draw timeline title
      this.ctx.fillStyle = '#333333';
      this.ctx.font = '14px sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'right';
      const titleGap = 10;
      this.ctx.fillText(timeline.name, screenX - titleGap, screenY);
    });
  }

  private darkenColor(hex: string, factor: number): string {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Darken by reducing brightness
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private drawInsertionIndicators(): void {
    this.timelines.forEach((timeline) => {
      // When dragging a chapter, only show indicators on the chapter's timeline
      if (this.isDraggingChapter && timeline.id !== this.draggedChapterTimelineId) {
        return;
      }
      
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;
      
      if (timeline.chapters && timeline.chapters.length > 0) {
        // Show insertion points between chapters, but NOT after the tail
        // Loop through all chapters except the tail (last chapter)
        const numInsertionPoints = timeline.chapters.length - 1;
        for (let i = 0; i < numInsertionPoints; i++) {
          const chapter = timeline.chapters[i];
          
          // Skip drawing indicator if this is the dragged chapter or the one after it
          if (this.isDraggingChapter && timeline.id === this.draggedChapterTimelineId) {
            const draggedChapterIndex = timeline.chapters.findIndex(ch => ch.id === this.draggedChapterId);
            // Don't show indicators immediately before or after the dragged chapter
            if (i === draggedChapterIndex || i === draggedChapterIndex - 1) {
              continue;
            }
          }
          
          const insertionX = screenX + ((chapter.x + chapter.width) * chapterSegmentWidth);
          
          const isHovered = this.hoveredInsertionPoint.timelineId === timeline.id &&
                           this.hoveredInsertionPoint.position === i + 1;
          
          // When dragging: red by default, green when hovered
          // When in insertion mode: green always (current behavior)
          const isDragging = this.isDraggingChapter;
          if (isDragging) {
            this.ctx.fillStyle = isHovered ? '#00dd00' : 'rgba(220, 0, 0, 0.6)';
            this.ctx.strokeStyle = isHovered ? '#00aa00' : 'rgba(180, 0, 0, 0.8)';
          } else {
            this.ctx.fillStyle = isHovered ? '#00dd00' : 'rgba(0, 200, 0, 0.6)';
            this.ctx.strokeStyle = isHovered ? '#00aa00' : 'rgba(0, 150, 0, 0.8)';
          }
          
          this.ctx.beginPath();
          this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Draw outline for better visibility
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    });
  }

  private getHoveredInsertionPoint(mouseX: number, mouseY: number): { timelineId: string | null; position: number } {
    const hitRadius = 15;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;

      if (timeline.chapters && timeline.chapters.length > 0) {
        // Check all insertion points (between chapters), but NOT after the tail
        // Loop through all chapters except the tail (last chapter)
        const numInsertionPoints = timeline.chapters.length - 1;
        for (let i = 0; i < numInsertionPoints; i++) {
          const chapter = timeline.chapters[i];
          
          // Skip checking insertion point if this is the dragged chapter
          // (its position has been modified and would give wrong insertionX)
          if (this.isDraggingChapter && timeline.id === this.draggedChapterTimelineId) {
            const draggedChapterIndex = timeline.chapters.findIndex(ch => ch.id === this.draggedChapterId);
            if (i === draggedChapterIndex || i === draggedChapterIndex - 1) {
              continue;
            }
          }
          
          const insertionX = screenX + ((chapter.x + chapter.width) * chapterSegmentWidth);
          
          const distance = Math.sqrt(Math.pow(mouseX - insertionX, 2) + Math.pow(mouseY - screenY, 2));
          if (distance < hitRadius) {
            // Return the chapter index where new chapter should be inserted (after current chapter)
            return { timelineId: timeline.id, position: i + 1 };
          }
        }
      }
    }

    return { timelineId: null, position: -1 };
  }

  private getClickedInsertionPoint(mouseX: number, mouseY: number): { timelineId: string; position: number } | null {
    const result = this.getHoveredInsertionPoint(mouseX, mouseY);
    if (result.timelineId !== null && result.position >= 0) {
      // getHoveredInsertionPoint returns the position in the visual array (1-based, accounting for Head)
      // We need to convert this to a 0-based index for insertion
      // Position 1 means "after Head", which is index 0 in the real chapters array
      const insertionIndex = result.position - 1;
      return { timelineId: result.timelineId, position: insertionIndex };
    }
    return null;
  }

  /**
   * Get clicked branch insertion point with actual grid position
   */
  private getClickedBranchInsertionPoint(mouseX: number, mouseY: number): { timelineId: string; gridPosition: number } | null {
    const hitRadius = 15;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;

      if (timeline.chapters && timeline.chapters.length > 0) {
        // Check all insertion points between chapters (not after tail)
        const numInsertionPoints = timeline.chapters.length - 1;
        for (let i = 0; i < numInsertionPoints; i++) {
          const chapter = timeline.chapters[i];
          // Calculate grid position from chapter data
          const gridPosition = Math.round((chapter.x + chapter.width) * 100) / 100;
          const insertionX = screenX + (gridPosition * chapterSegmentWidth);
          
          const distance = Math.sqrt(Math.pow(mouseX - insertionX, 2) + Math.pow(mouseY - screenY, 2));
          if (distance < hitRadius) {
            // Return the actual grid position (world coordinates)
            return { timelineId: timeline.id, gridPosition };
          }
        }
      }
    }

    return null;
  }

  /**
   * Draw all branches between timelines
   */
  private drawBranches(): void {
    this.branches.forEach(branch => {
      const startTimeline = this.timelines.find(t => t.id === branch.startContinuityId);
      const endTimeline = this.timelines.find(t => t.id === branch.endContinuityId);
      
      if (!startTimeline || !endTimeline) return;
      
      // Calculate start and end positions in world coordinates
      const chapterSegmentWidth = this.gridSize; // World coordinates, not screen
      const startWorldX = startTimeline.x + (branch.startPosition * chapterSegmentWidth);
      const startWorldY = startTimeline.y;
      const endWorldX = endTimeline.x + (branch.endPosition * chapterSegmentWidth);
      const endWorldY = endTimeline.y;
      
      // Convert to screen coordinates
      const startScreenX = startWorldX * this.zoom + this.offsetX;
      const startScreenY = startWorldY * this.zoom + this.offsetY;
      const endScreenX = endWorldX * this.zoom + this.offsetX;
      const endScreenY = endWorldY * this.zoom + this.offsetY;
      
      // Draw curved line using S-curve (cubic bezier)
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3;
      
      // Apply line style (default solid)
      if (branch.lineStyle === 'dashed') {
        this.ctx.setLineDash([8, 4]); // 8px dashes, 4px gaps
      } else {
        this.ctx.setLineDash([]);
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(startScreenX, startScreenY);
      
      // S-curve control points - create backwards S shape
      const dx = endScreenX - startScreenX;
      const dy = endScreenY - startScreenY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const curveOffset = Math.min(distance * 0.4, 100);
      
      // First control point: offset to the right of start point
      const cp1X = startScreenX + curveOffset;
      const cp1Y = startScreenY;
      
      // Second control point: offset to the left of end point
      const cp2X = endScreenX - curveOffset;
      const cp2Y = endScreenY;
      
      this.ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endScreenX, endScreenY);
      this.ctx.stroke();
      
      // Reset line dash to avoid affecting other drawings
      this.ctx.setLineDash([]);

      // Draw endpoints with styles (default to dot)
      const startStyle = branch.startEndpointStyle || 'dot';
      const endStyle = branch.endEndpointStyle || 'dot';
      // For branches, arrows always point to the right; use a fake left neighbor to set angle
      this.drawEndpoint(startScreenX, startScreenY, startStyle, startScreenX - 1, startScreenY);
      this.drawEndpoint(endScreenX, endScreenY, endStyle, endScreenX - 1, endScreenY);
    });
  }

  /**
   * Draw branch insertion mode indicators and preview
   */
  private drawBranchInsertionIndicators(): void {
    // Draw all insertion points on all timelines
    this.timelines.forEach((timeline) => {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;
      
      if (timeline.chapters && timeline.chapters.length > 0) {
        // Show insertion points between chapters (same as chapter insertion mode)
        const numInsertionPoints = timeline.chapters.length - 1;
        for (let i = 0; i < numInsertionPoints; i++) {
          const chapter = timeline.chapters[i];
          // Round to avoid floating point precision issues
          const gridPosition = Math.round((chapter.x + chapter.width) * 100) / 100;
          const insertionX = screenX + (gridPosition * chapterSegmentWidth);
          
          const isHovered = this.branchHoveredPoint.timelineId === timeline.id &&
                           this.branchHoveredPoint.position === gridPosition;
          
          const isFirstPoint = this.branchFirstPoint?.timelineId === timeline.id &&
                               this.branchFirstPoint?.position === gridPosition;
          
          // Color: blue for valid points, red if same timeline as first point
          let validPoint = true;
          if (this.branchFirstPoint && timeline.id === this.branchFirstPoint.timelineId) {
            validPoint = false; // Can't connect timeline to itself
          }
          
          if (isFirstPoint) {
            // First point is always blue and larger
            this.ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
            this.ctx.strokeStyle = 'rgba(0, 70, 200, 1.0)';
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 10, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 10, 0, Math.PI * 2);
            this.ctx.stroke();
          } else if (!validPoint) {
            // Invalid point (same timeline) - don't render it
          } else {
            // Valid point
            this.ctx.fillStyle = isHovered ? 'rgba(0, 150, 0, 0.8)' : 'rgba(100, 200, 100, 0.5)';
            this.ctx.strokeStyle = isHovered ? 'rgba(0, 100, 0, 1.0)' : 'rgba(80, 150, 80, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(insertionX, screenY, 8, 0, Math.PI * 2);
            this.ctx.stroke();
          }
        }
      }
    });
    
    // Draw preview line if first point is selected and hovering over a valid second point
    if (this.branchFirstPoint && this.branchHoveredPoint.timelineId !== null &&
        this.branchHoveredPoint.timelineId !== this.branchFirstPoint.timelineId) {
      
      const startTimeline = this.timelines.find(t => t.id === this.branchFirstPoint!.timelineId);
      const endTimeline = this.timelines.find(t => t.id === this.branchHoveredPoint.timelineId);
      
      if (startTimeline && endTimeline) {
        // Calculate world coordinates first, then convert to screen (same as drawBranches)
        const chapterSegmentWidth = this.gridSize; // World coordinates, not screen
        
        // Calculate start position in world coordinates
        const startWorldX = startTimeline.x + (this.branchFirstPoint.position * chapterSegmentWidth);
        const startWorldY = startTimeline.y;
        
        // Calculate end position in world coordinates
        const endWorldX = endTimeline.x + (this.branchHoveredPoint.position * chapterSegmentWidth);
        const endWorldY = endTimeline.y;
        
        // Convert to screen coordinates
        const startScreenX = startWorldX * this.zoom + this.offsetX;
        const startScreenY = startWorldY * this.zoom + this.offsetY;
        const endScreenX = endWorldX * this.zoom + this.offsetX;
        const endScreenY = endWorldY * this.zoom + this.offsetY;
        
        // Draw preview curved line (S-curve with cubic bezier)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(startScreenX, startScreenY);
        
        // S-curve control points for preview
        const dx = endScreenX - startScreenX;
        const dy = endScreenY - startScreenY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(distance * 0.4, 100);
        
        const cp1X = startScreenX + curveOffset;
        const cp1Y = startScreenY;
        
        const cp2X = endScreenX - curveOffset;
        const cp2Y = endScreenY;
        
        this.ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endScreenX, endScreenY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }

  /**
   * Detect if user clicked on a branch endpoint (for opening branch edit)
   */
  private getClickedBranch(mouseX: number, mouseY: number): string | null {
    const hitRadius = 15; // Pixels to detect click on branch curve or endpoint
    
    for (const branch of this.branches) {
      // Find the start and end timelines
      const startTimeline = this.timelines.find(t => t.id === branch.startContinuityId);
      const endTimeline = this.timelines.find(t => t.id === branch.endContinuityId);
      
      if (!startTimeline || !endTimeline) continue;
      
      // Calculate screen coordinates for start point using position
      const chapterSegmentWidth = this.gridSize * this.zoom;
      const startScreenX = startTimeline.x * this.zoom + this.offsetX + 
                          (branch.startPosition * chapterSegmentWidth);
      const startScreenY = startTimeline.y * this.zoom + this.offsetY;
      
      // Calculate screen coordinates for end point using position
      const endScreenX = endTimeline.x * this.zoom + this.offsetX + 
                        (branch.endPosition * chapterSegmentWidth);
      const endScreenY = endTimeline.y * this.zoom + this.offsetY;
      
      // Calculate control points for S-curve (backwards S: exit right, approach from left)
      const horizontalOffset = 100 * this.zoom;
      const cp1x = startScreenX + horizontalOffset;
      const cp1y = startScreenY;
      const cp2x = endScreenX - horizontalOffset;
      const cp2y = endScreenY;
      
      // Check if click is near the curve by sampling points along the bezier
      let minDist = Infinity;
      const samples = 50; // Number of points to sample along the curve
      
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const mt = 1 - t;
        
        // Cubic bezier formula: B(t) = (1-t)³P0 + 3(1-t)²t P1 + 3(1-t)t²P2 + t³P3
        const curveX = mt*mt*mt*startScreenX + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*endScreenX;
        const curveY = mt*mt*mt*startScreenY + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*endScreenY;
        
        const dx = mouseX - curveX;
        const dy = mouseY - curveY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        minDist = Math.min(minDist, dist);
        
        // Early exit if we found a close point
        if (minDist <= hitRadius) {
          return branch.id;
        }
      }
    }
    
    return null;
  }

  private getClickedTimelineOrChapter(mouseX: number, mouseY: number): { type: string; id: string; timelineId?: string; title?: string } | null {
    const chapterSegmentWidth = this.gridSize * this.zoom;
    const chapterHeight = 30;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;

      // Check if clicking on timeline title (now positioned to the left of timeline)
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'right';
      const titleMetrics = this.ctx.measureText(timeline.name);
      const titleGap = 10; // Same gap used when drawing
      const titleX = screenX - titleGap;
      const titleY = screenY;
      const titleWidth = titleMetrics.width;
      const titleHeight = 20; // Approximate text height
      
      if (mouseY > titleY - titleHeight / 2 && mouseY < titleY + titleHeight / 2 && 
          mouseX > titleX - titleWidth && mouseX < titleX) {
        return { type: 'timeline-title', id: timeline.id };
      }

      // Check if clicking on a chapter
      if (timeline.chapters) {
        for (const chapter of timeline.chapters) {
          const chapterScreenX = screenX + (chapter.x * chapterSegmentWidth);
          const chapterScreenWidth = chapter.width * chapterSegmentWidth;
          const chapterScreenY = screenY - chapterHeight;

          if (mouseX > chapterScreenX && mouseX < chapterScreenX + chapterScreenWidth &&
              mouseY > chapterScreenY && mouseY < chapterScreenY + chapterHeight) {
            return { type: 'chapter', id: chapter.id, timelineId: timeline.id, title: chapter.title };
          }
        }
      }
    }

    return null;
  }

  private isDraggableTimelineElement(mouseX: number, mouseY: number): { timelineId: string; isDraggable: boolean } | null {
    const chapterSegmentWidth = this.gridSize * this.zoom;
    const chapterHeight = 30;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;

      // Check title area
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'right';
      const titleMetrics = this.ctx.measureText(timeline.name);
      const titleGap = 10;
      const titleX = screenX - titleGap;
      const titleY = screenY;
      const titleWidth = titleMetrics.width;
      const titleHeight = 20;
      
      if (mouseY > titleY - titleHeight / 2 && mouseY < titleY + titleHeight / 2 && 
          mouseX > titleX - titleWidth && mouseX < titleX) {
        return { timelineId: timeline.id, isDraggable: true };
      }

      // Check head and tail chapters
      if (timeline.chapters) {
        const headChapter = timeline.chapters.find(ch => ch.title === 'Head');
        const tailChapter = timeline.chapters.find(ch => ch.title === 'Tail');
        
        for (const chapter of [headChapter, tailChapter]) {
          if (!chapter) continue;
          
          const chapterScreenX = screenX + (chapter.x * chapterSegmentWidth);
          const chapterScreenWidth = chapter.width * chapterSegmentWidth;
          const chapterScreenY = screenY - chapterHeight;

          if (mouseX > chapterScreenX && mouseX < chapterScreenX + chapterScreenWidth &&
              mouseY > chapterScreenY && mouseY < chapterScreenY + chapterHeight) {
            return { timelineId: timeline.id, isDraggable: true };
          }
        }
        
        // Check timeline line area (below chapter text but within the timeline region)
        // This allows dragging the timeline by clicking on the timeline itself under chapters
        const lineStartX = screenX;
        let lineEndX = screenX + (timeline.width * this.zoom);
        if (timeline.chapters.length > 0) {
          const lastChapter = timeline.chapters[timeline.chapters.length - 1];
          lineEndX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth) + 20;
        }
        
        const lineHitArea = 15; // Vertical hit area around the timeline line
        if (mouseX > lineStartX && mouseX < lineEndX &&
            mouseY > screenY - lineHitArea && mouseY < screenY + lineHitArea) {
          return { timelineId: timeline.id, isDraggable: true };
        }
      }
    }

    return null;
  }

  private isDraggableChapterElement(mouseX: number, mouseY: number): { timelineId: string; chapterId: string; x: number } | null {
    const chapterSegmentWidth = this.gridSize * this.zoom;
    const chapterHeight = 30;
    const tickHeight = 8;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;

      if (timeline.chapters) {
        // Skip Head and Tail chapters - only allow dragging regular chapters
        for (const chapter of timeline.chapters) {
          if (chapter.title === 'Head' || chapter.title === 'Tail') continue;

          const chapterScreenX = screenX + (chapter.x * chapterSegmentWidth);
          const chapterScreenWidth = chapter.width * chapterSegmentWidth;
          const chapterScreenY = screenY - chapterHeight;
          
          // Only detect clicks on the text area (upper portion), not the timeline area below
          // This allows clicks on the timeline itself to trigger timeline dragging
          const textAreaBottom = screenY - tickHeight;

          if (mouseX > chapterScreenX && mouseX < chapterScreenX + chapterScreenWidth &&
              mouseY > chapterScreenY && mouseY < textAreaBottom) {
            return { timelineId: timeline.id, chapterId: chapter.id, x: chapter.x };
          }
        }
      }
    }

    return null;
  }

  private isDraggableArcElement(mouseX: number, mouseY: number): { timelineId: string; arcId: string; order: number } | null {
    // Arc dragging is always enabled
    const chapterSegmentWidth = this.gridSize * this.zoom;

    for (const timeline of this.timelines) {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      
      const arcs = this.timelineArcs.get(timeline.id) || [];
      if (arcs.length === 0 || !timeline.chapters) continue;

      // Build arc groups just like in drawTimelinesArcMode
      const arcGroups: { arcId: string; chapters: any[] }[] = [];
      
      if (timeline.chapters) {
        let currentArcId: string | null = null;
        let currentGroup: any[] = [];

        timeline.chapters.forEach(chapter => {
          if (chapter.title === 'Head' || chapter.title === 'Tail') return;
          
          // Each unassigned chapter is its own group
          const arcId = chapter.arcId || `unassigned-${chapter.id}`;
          
          if (arcId !== currentArcId) {
            if (currentGroup.length > 0) {
              arcGroups.push({ arcId: currentArcId!, chapters: currentGroup });
            }
            currentArcId = arcId;
            currentGroup = [chapter];
          } else {
            currentGroup.push(chapter);
          }
        });

        if (currentGroup.length > 0 && currentArcId) {
          arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
        }
      }

      // Check if clicking on any arc title
      for (const group of arcGroups) {
        const arc = arcs.find(a => a.id === group.arcId);
        if (!arc || group.chapters.length === 0) continue;

        const firstChapter = group.chapters[0];
        const lastChapter = group.chapters[group.chapters.length - 1];
        
        const startX = screenX + (firstChapter.x * chapterSegmentWidth);
        const endX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
        const centerX = (startX + endX) / 2;

        // Calculate text bounds
        this.ctx.font = 'bold 13px sans-serif';
        const textMetrics = this.ctx.measureText(arc.name);
        const textWidth = textMetrics.width;
        const textHeight = 16; // Approximate
        const textX = centerX - textWidth / 2;
        const textY = screenY - 28 - textHeight;

        if (mouseX > textX && mouseX < textX + textWidth &&
            mouseY > textY && mouseY < textY + textHeight) {
          return { timelineId: timeline.id, arcId: arc.id, order: arc.order };
        }
      }
    }

    return null;
  }

  private getHoveredArcInsertionPoint(mouseX: number, mouseY: number): { timelineId: string | null; position: number } {
    // Only show arc insertion points when dragging
    if (!this.isDraggingArc) return { timelineId: null, position: -1 };

    const hitRadius = 15;
    const chapterSegmentWidth = this.gridSize * this.zoom;

    for (const timeline of this.timelines) {
      // Only check the timeline we're dragging on
      if (timeline.id !== this.draggedArcTimelineId) continue;
      
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      
      if (!timeline.chapters) continue;

      // Build arc groups
      const arcGroups: { arcId: string; chapters: any[] }[] = [];
      
      if (timeline.chapters) {
        let currentArcId: string | null = null;
        let currentGroup: any[] = [];

        timeline.chapters.forEach(chapter => {
          if (chapter.title === 'Head' || chapter.title === 'Tail') return;
          
          // Each unassigned chapter is its own group
          const arcId = chapter.arcId || `unassigned-${chapter.id}`;
          
          if (arcId !== currentArcId) {
            if (currentGroup.length > 0) {
              arcGroups.push({ arcId: currentArcId!, chapters: currentGroup });
            }
            currentArcId = arcId;
            currentGroup = [chapter];
          } else {
            currentGroup.push(chapter);
          }
        });

        if (currentGroup.length > 0 && currentArcId) {
          arcGroups.push({ arcId: currentArcId, chapters: currentGroup });
        }
      }

      // Check insertion points between arc groups
      for (let i = 0; i < arcGroups.length; i++) {
        const group = arcGroups[i];
        const lastChapter = group.chapters[group.chapters.length - 1];
        const insertionX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
        
        const distance = Math.sqrt(Math.pow(mouseX - insertionX, 2) + Math.pow(mouseY - screenY, 2));
        if (distance < hitRadius) {
          // Return position after this arc group
          return { timelineId: timeline.id, position: i + 1 };
        }
      }

      // Also check before the first arc (position 0)
      if (arcGroups.length > 0) {
        const firstGroup = arcGroups[0];
        const firstChapter = firstGroup.chapters[0];
        const insertionX = screenX + (firstChapter.x * chapterSegmentWidth);
        
        const distance = Math.sqrt(Math.pow(mouseX - insertionX, 2) + Math.pow(mouseY - screenY, 2));
        if (distance < hitRadius) {
          return { timelineId: timeline.id, position: 0 };
        }
      }
    }

    return { timelineId: null, position: -1 };
  }

  private drawTextboxes(): void {
    // Create or update HTML elements for each textbox
    const existingIds = new Set(this.textboxElements.keys());
    const currentIds = new Set(this.textboxes.map(t => t.id));
    
    // Remove textboxes that no longer exist
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const element = this.textboxElements.get(id);
        if (element) {
          element.remove();
          this.textboxElements.delete(id);
        }
      }
    }
    
    // Create or update textbox elements
    for (const textbox of this.textboxes) {
      const screenX = textbox.x + this.offsetX / this.zoom;
      const screenY = textbox.y + this.offsetY / this.zoom;
      
      let element = this.textboxElements.get(textbox.id);
      
      if (!element) {
        // Create new textbox element
        element = document.createElement('div');
        element.className = 'textbox-overlay';
        element.dataset.textboxId = textbox.id;
        element.style.position = 'absolute';
        element.style.border = '2px solid transparent';
        element.style.boxSizing = 'border-box';
        element.style.padding = '8px';
        // Let events pass through to canvas; all hit-testing is coordinate-based
        element.style.pointerEvents = 'none';
        element.style.overflow = 'auto';
        element.style.wordWrap = 'break-word';
        element.style.whiteSpace = 'pre-line';
        element.style.cursor = 'default';
        element.style.fontFamily = 'sans-serif';
        element.innerHTML = marked(textbox.content) as string;
        
        this.textboxOverlayContainer?.appendChild(element);
        this.textboxElements.set(textbox.id, element);
      }
      
      // Update position and size - use world coordinates, let CSS scale handle zoom
      element.style.left = (screenX * this.zoom) + 'px';
      element.style.top = (screenY * this.zoom) + 'px';
      element.style.width = textbox.width + 'px';
      element.style.height = textbox.height + 'px';
      element.style.transform = `scale(${this.zoom})`;
      element.style.transformOrigin = 'top left';
      // Font size stays at model value - CSS scale handles zoom uniformly
      element.style.fontSize = textbox.fontSize + 'px';
      element.style.lineHeight = (textbox.fontSize * 1.4) + 'px';
      
      // Apply text alignment (horizontal) and fixed vertical alignment via flexbox
      const textAlign = textbox.alignX || 'left';
      element.style.textAlign = textAlign;
      const verticalAlign = textbox.alignY || 'top';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.justifyContent = verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
      element.style.paddingTop = '8px';
      element.style.paddingBottom = '8px';
      
      // Update content if changed - preserve blank lines while supporting markdown
      const processContent = () => {
        // Split by double newlines to preserve paragraph breaks
        const paragraphs = textbox.content.split('\n\n');
        // Process each paragraph through marked, then join with spacing
        const processedParagraphs = paragraphs.map((para: string) => {
          const markedPara = marked(para) as string;
          // Remove <p> tags but preserve the HTML content inside
          return markedPara.replace(/^<p>|<\/p>$/g, '').trim();
        });
        // Join with blank line spacing using margin
        return processedParagraphs.map((p: string) => `<p style="margin-bottom: 1em;">${p}</p>`).join('');
      };
      const newContent = processContent();
      if (element.innerHTML !== newContent) {
        element.innerHTML = newContent;
        // After content updates, sync the model height if content doesn't fit
        // scrollHeight is unaffected by CSS transform, so compare directly
        // Add small threshold to prevent infinite micro-adjustments
        const contentHeight = element.scrollHeight;
        if (contentHeight > textbox.height + 2) {
          textbox.height = contentHeight;
        }
      }
      
      // Update hover state
      if (this.hoveredTextboxId === textbox.id) {
        element.style.borderColor = 'rgba(100, 150, 255, 0.6)';
      } else {
        element.style.borderColor = 'transparent';
      }
    }
  }

  private drawLines(): void {
    // Draw all lines
    for (const line of this.lines) {
      const screenX1 = line.gridX1 * this.gridSize * this.zoom + this.offsetX;
      const screenY1 = line.gridY1 * this.gridSize * this.zoom + this.offsetY;
      const screenX2 = line.gridX2 * this.gridSize * this.zoom + this.offsetX;
      const screenY2 = line.gridY2 * this.gridSize * this.zoom + this.offsetY;

      // Draw line (always gray, no hover color)
      this.ctx.strokeStyle = '#666666';
      this.ctx.lineWidth = 2;
      
      if (line.lineStyle === 'dashed') {
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.setLineDash([]);
      }

      this.ctx.beginPath();
      this.ctx.moveTo(screenX1, screenY1);
      this.ctx.lineTo(screenX2, screenY2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw endpoints with their styles
      this.drawEndpoint(screenX1, screenY1, line.startEndpointStyle || 'dot', screenX2, screenY2);
      this.drawEndpoint(screenX2, screenY2, line.endEndpointStyle || 'dot', screenX1, screenY1);
    }

    // Draw line insertion mode indicators
    if (this.lineInsertionMode) {
      this.drawLineInsertionIndicators();
    }
  }

  private drawEndpoint(x: number, y: number, style: 'dot' | 'arrow' | 'none', otherX?: number, otherY?: number): void {
    const size = 6;
    this.ctx.fillStyle = '#333333';

    if (style === 'none') {
      return; // Don't draw anything
    } else if (style === 'dot') {
      // Draw a filled circle
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (style === 'arrow' && otherX !== undefined && otherY !== undefined) {
      // Draw an arrow pointing away from the other point (outward from the line)
      const angle = Math.atan2(y - otherY, x - otherX);
      const arrowSize = 12; // Match timeline tail arrow
      const halfWidth = arrowSize / 2;

      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      // Tip is forward from the endpoint
      const tipX = x + dirX * arrowSize;
      const tipY = y + dirY * arrowSize;

      // Base center sits arrowSize back from tip (at the endpoint)
      const baseCenterX = tipX - dirX * arrowSize;
      const baseCenterY = tipY - dirY * arrowSize;

      // Perpendicular vector for width
      const perpX = -dirY;
      const perpY = dirX;

      const baseX1 = baseCenterX + perpX * halfWidth;
      const baseY1 = baseCenterY + perpY * halfWidth;
      const baseX2 = baseCenterX - perpX * halfWidth;
      const baseY2 = baseCenterY - perpY * halfWidth;

      // Draw filled triangle
      this.ctx.beginPath();
      this.ctx.moveTo(tipX, tipY);
      this.ctx.lineTo(baseX1, baseY1);
      this.ctx.lineTo(baseX2, baseY2);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawLineInsertionIndicators(): void {
    // Draw grid points and preview line if needed
    const gridSize = this.gridSize;
    const pointRadius = 4;
    const previewColor = 'rgba(100, 150, 255, 0.6)';
    const normalColor = 'rgba(150, 150, 150, 0.3)';

    // Draw all possible grid points
    const startX = Math.floor((-this.offsetX) / (gridSize * this.zoom)) * gridSize;
    const endX = startX + Math.ceil((this.canvas.width / this.zoom + gridSize));
    
    const startY = Math.floor((-this.offsetY) / (gridSize * this.zoom)) * gridSize;
    const endY = startY + Math.ceil((this.canvas.height / this.zoom + gridSize));

    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        const screenX = x * this.zoom + this.offsetX;
        const screenY = y * this.zoom + this.offsetY;

        // Highlight the hovered point
        if (this.lineHoveredPoint && this.lineHoveredPoint.gridX === x / gridSize && this.lineHoveredPoint.gridY === y / gridSize) {
          this.ctx.fillStyle = previewColor;
          this.ctx.beginPath();
          this.ctx.arc(screenX, screenY, pointRadius + 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillStyle = normalColor;
          this.ctx.beginPath();
          this.ctx.arc(screenX, screenY, pointRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Draw preview line if first point is selected
    if (this.lineFirstPoint && this.lineHoveredPoint) {
      const screenX1 = this.lineFirstPoint.gridX * gridSize * this.zoom + this.offsetX;
      const screenY1 = this.lineFirstPoint.gridY * gridSize * this.zoom + this.offsetY;
      const screenX2 = this.lineHoveredPoint.gridX * gridSize * this.zoom + this.offsetX;
      const screenY2 = this.lineHoveredPoint.gridY * gridSize * this.zoom + this.offsetY;

      this.ctx.strokeStyle = previewColor;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(screenX1, screenY1);
      this.ctx.lineTo(screenX2, screenY2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  // Rendering markdown text on canvas - kept for reference but using HTML rendering instead
  // @ts-ignore - unused but kept as reference
  private renderMarkdownText(text: string, x: number, y: number, maxWidth: number, maxHeight: number, fontSize: number, alignX: string = 'left', alignY: string = 'top'): number {
    // Convert markdown to HTML
    const html = marked(text) as string;
    
    // Parse HTML to extract text runs with formatting
    const textRuns = this.parseMarkdownHTML(html, fontSize);
    
    // Set text alignment
    const originalTextAlign = this.ctx.textAlign;
    let alignXOffset = 0;
    if (alignX === 'center') {
      this.ctx.textAlign = 'center';
      alignXOffset = maxWidth / 2;
    } else if (alignX === 'right') {
      this.ctx.textAlign = 'right';
      alignXOffset = maxWidth;
    } else {
      this.ctx.textAlign = 'left';
    }
    
    this.ctx.textBaseline = 'top';

    // Wrap text runs into lines
    const lines = this.wrapTextRuns(textRuns, maxWidth);
    
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    
    // Calculate starting Y based on vertical alignment
    let currentY = y;
    if (alignY === 'middle') {
      currentY = y + (maxHeight - totalHeight) / 2;
    } else if (alignY === 'bottom') {
      currentY = y + maxHeight - totalHeight;
    }

    // Render each line
    for (const line of lines) {
      if (currentY + lineHeight > y + maxHeight) break;
      
      // Render line with styled text runs
      let currentX = x + alignXOffset;
      for (const run of line) {
        this.renderTextRun(run, currentX, currentY);
        currentX += (run.width || 0);
      }
      
      currentY += lineHeight;
    }
    
    // Restore original alignment
    this.ctx.textAlign = originalTextAlign;
    
    // Return required height in screen pixels
    return totalHeight;
  }

  private parseMarkdownHTML(html: string, fontSize: number): Array<{ text: string; bold: boolean; italic: boolean; strikethrough: boolean; code: boolean; width?: number }> {
    const runs: Array<{ text: string; bold: boolean; italic: boolean; strikethrough: boolean; code: boolean; width?: number }> = [];
    
    // Replace HTML entities
    let text = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Remove <p> tags and convert <br> to newlines
    text = text
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    let bold = false;
    let italic = false;
    let strikethrough = false;
    let code = false;

    // Parse HTML and extract text with formatting
    let i = 0;
    let currentText = '';

    while (i < text.length) {
      if (text[i] === '<') {
        // Found a tag
        const endTag = text.indexOf('>', i);
        if (endTag === -1) break;

        // Save current text with current formatting
        if (currentText) {
          runs.push({
            text: currentText,
            bold,
            italic,
            strikethrough,
            code
          });
          currentText = '';
        }

        const tag = text.substring(i + 1, endTag);
        const tagName = tag.split(/[\s>]/)[0].toLowerCase();
        const isClosing = tag.startsWith('/');

        if (isClosing) {
          // Closing tag
          if (tagName === 'strong' || tagName === 'b') {
            bold = false;
          } else if (tagName === 'em' || tagName === 'i') {
            italic = false;
          } else if (tagName === 's' || tagName === 'del' || tagName === 'strike') {
            strikethrough = false;
          } else if (tagName === 'code') {
            code = false;
          }
        } else {
          // Opening tag
          if (tagName === 'strong' || tagName === 'b') {
            bold = true;
          } else if (tagName === 'em' || tagName === 'i') {
            italic = true;
          } else if (tagName === 's' || tagName === 'del' || tagName === 'strike') {
            strikethrough = true;
          } else if (tagName === 'code') {
            code = true;
          }
        }

        i = endTag + 1;
      } else {
        // Regular text character
        currentText += text[i];
        i++;
      }
    }

    // Add any remaining text
    if (currentText) {
      runs.push({
        text: currentText,
        bold,
        italic,
        strikethrough,
        code
      });
    }

    // Calculate width for each run
    for (const run of runs) {
      const fontStr = this.getFontString(fontSize, run.bold, run.italic, run.code);
      this.ctx.font = fontStr;
      run.width = this.ctx.measureText(run.text).width;
    }

    return runs;
  }

  private getFontString(fontSize: number, bold: boolean = false, italic: boolean = false, code: boolean = false): string {
    let fontFamily = code ? 'monospace' : 'sans-serif';
    let fontWeight = bold ? 'bold' : 'normal';
    let fontStyle = italic ? 'italic' : 'normal';
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  }

  private renderTextRun(run: any, x: number, y: number): void {
    const fontSize = parseInt(this.ctx.font);
    const fontStr = this.getFontString(fontSize, run.bold, run.italic, run.code);
    this.ctx.font = fontStr;
    this.ctx.fillStyle = '#000000';

    // Handle line breaks
    const lines = run.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], x, y + i * fontSize * 1.4);
    }

    // Draw strikethrough if needed
    if (run.strikethrough) {
      const strikethroughY = y + fontSize * 0.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, strikethroughY);
      this.ctx.lineTo(x + (run.width || 0), strikethroughY);
      this.ctx.stroke();
    }
  }

  private wrapTextRuns(runs: Array<{ text: string; bold: boolean; italic: boolean; strikethrough: boolean; code: boolean; width?: number }>, maxWidth: number): Array<Array<any>> {
    const lines: Array<Array<any>> = [];
    let currentLine: Array<any> = [];
    let currentLineWidth = 0;

    for (const run of runs) {
      const textParts = run.text.split('\n');
      
      for (let i = 0; i < textParts.length; i++) {
        const part = textParts[i];
        
        if (i > 0) {
          // Newline encountered
          if (currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }
        }

        if (!part) continue;

        const fontStr = this.getFontString(14, run.bold, run.italic, run.code); // Use default fontSize
        this.ctx.font = fontStr;
        const partWidth = this.ctx.measureText(part).width;

        // Check if adding this part exceeds maxWidth
        if (currentLineWidth + partWidth > maxWidth && currentLine.length > 0) {
          // Start new line
          lines.push(currentLine);
          currentLine = [{
            text: part,
            bold: run.bold,
            italic: run.italic,
            strikethrough: run.strikethrough,
            code: run.code,
            width: partWidth
          }];
          currentLineWidth = partWidth;
        } else {
          // Add to current line
          currentLine.push({
            text: part,
            bold: run.bold,
            italic: run.italic,
            strikethrough: run.strikethrough,
            code: run.code,
            width: partWidth
          });
          currentLineWidth += partWidth;
        }
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }


  private getClickedTextboxElement(mouseX: number, mouseY: number): { type: string; textboxId: string; handle?: string } | null {
    const borderHitRadius = 8; // Pixels from edge to count as border click
    
    for (const textbox of this.textboxes) {
      const screenX = textbox.x * this.zoom + this.offsetX;
      const screenY = textbox.y * this.zoom + this.offsetY;
      const screenWidth = textbox.width * this.zoom;
      const screenHeight = textbox.height * this.zoom;

      // Check if clicking on textbox body first
      if (mouseX >= screenX && mouseX <= screenX + screenWidth &&
          mouseY >= screenY && mouseY <= screenY + screenHeight) {
        
        // Check if clicking on borders for resizing
        const leftEdge = Math.abs(mouseX - screenX) <= borderHitRadius;
        const rightEdge = Math.abs(mouseX - (screenX + screenWidth)) <= borderHitRadius;
        const topEdge = Math.abs(mouseY - screenY) <= borderHitRadius;
        const bottomEdge = Math.abs(mouseY - (screenY + screenHeight)) <= borderHitRadius;
        
        // Corner handles (check corners first for priority)
        if (topEdge && leftEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'nw' };
        }
        if (topEdge && rightEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'ne' };
        }
        if (bottomEdge && leftEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'sw' };
        }
        if (bottomEdge && rightEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'se' };
        }
        
        // Edge handles
        if (topEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'n' };
        }
        if (bottomEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 's' };
        }
        if (leftEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'w' };
        }
        if (rightEdge) {
          return { type: 'resize-handle', textboxId: textbox.id, handle: 'e' };
        }
        
        // Body click
        return { type: 'textbox-body', textboxId: textbox.id };
      }
    }

    return null;
  }

  private getClickedLine(mouseX: number, mouseY: number): string | null {
    const hitRadius = 8; // Pixels
    
    for (const line of this.lines) {
      const screenX1 = line.gridX1 * this.gridSize * this.zoom + this.offsetX;
      const screenY1 = line.gridY1 * this.gridSize * this.zoom + this.offsetY;
      const screenX2 = line.gridX2 * this.gridSize * this.zoom + this.offsetX;
      const screenY2 = line.gridY2 * this.gridSize * this.zoom + this.offsetY;

      // Check distance from point to line segment
      const distance = this.distanceToLineSegment(mouseX, mouseY, screenX1, screenY1, screenX2, screenY2);
      if (distance <= hitRadius) {
        return line.id;
      }
    }

    return null;
  }

  private getClickedLineEndpoint(mouseX: number, mouseY: number): { lineId: string; endpoint: 'start' | 'end' } | null {
    const hitRadius = 10; // Pixels
    
    for (const line of this.lines) {
      const screenX1 = line.gridX1 * this.gridSize * this.zoom + this.offsetX;
      const screenY1 = line.gridY1 * this.gridSize * this.zoom + this.offsetY;
      const screenX2 = line.gridX2 * this.gridSize * this.zoom + this.offsetX;
      const screenY2 = line.gridY2 * this.gridSize * this.zoom + this.offsetY;

      // Check distance from mouse to start point
      const dist1 = Math.sqrt(Math.pow(mouseX - screenX1, 2) + Math.pow(mouseY - screenY1, 2));
      if (dist1 <= hitRadius) {
        return { lineId: line.id, endpoint: 'start' };
      }

      // Check distance from mouse to end point
      const dist2 = Math.sqrt(Math.pow(mouseX - screenX2, 2) + Math.pow(mouseY - screenY2, 2));
      if (dist2 <= hitRadius) {
        return { lineId: line.id, endpoint: 'end' };
      }
    }

    return null;
  }

  private distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getResizeCursor(handle: string): string {
    switch (handle) {
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      default:
        return 'grab';
    }
  }

  dispose(): void {
    this.canvas.remove();
  }
}
/**
 * Menu System - Handles the floating menu UI
 * Manages animation, positioning, and interaction
 */
class MenuSystem {
  private isOpened: boolean = false;
  private animationProgress: number = 0; // 0 = closed, 1 = fully open
  private isAnimating: boolean = false;
  private animationDirection: 'open' | 'close' = 'open'; // Which direction we're animating
  private canvasHeight: number = 0; // Will be set when rendering
  private cachedMenuWidth: number = 150; // Cache the measured menu width
  
  private options: { id: string; label: string; keybind?: string }[] = [
    { id: 'new-timeline', label: 'New Timeline', keybind: 'Shift + T' },
    { id: 'new-chapter', label: 'New Chapter', keybind: 'Shift + C' },
    { id: 'new-branch', label: 'New Branch', keybind: 'Shift + B' },
    { id: 'new-textbox', label: 'New Textbox', keybind: 'Shift + S' },
    { id: 'new-line', label: 'New Line', keybind: 'Shift + D' }
  ];
  
  // Button and menu dimensions
  private readonly buttonSize = 50;
  private readonly buttonPadding = 20;
  private readonly optionHeight = 40;
  private readonly optionPadding = 10;
  private readonly menuMargin = 5;
  
  constructor() {
    // Start with menu closed
    this.animationProgress = 0;
  }
  
  /**
   * Add a new option to the menu dynamically
   */
  addOption(id: string, label: string): void {
    this.options.push({ id, label });
  }
  
  /**
   * Toggle menu open/closed
   */
  toggle(): void {
    if (this.isOpened) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Open the menu with animation
   */
  open(): void {
    if (!this.isOpened) {
      this.isOpened = true;
      this.isAnimating = true;
      this.animationDirection = 'open';
    }
  }
  
  /**
   * Close the menu with animation
   */
  close(): void {
    if (this.isOpened) {
      this.isOpened = false;
      this.isAnimating = true;
      this.animationDirection = 'close';
    }
  }
  
  /**
   * Check if menu is open
   */
  isOpen(): boolean {
    return this.isOpened;
  }
  
  /**
   * Update animation progress (call from render loop)
   */
  update(): boolean {
    if (!this.isAnimating) {
      return false;
    }
    
    const animationSpeed = 0.15;
    
    if (this.animationDirection === 'open') {
      this.animationProgress = Math.min(1, this.animationProgress + animationSpeed);
      if (this.animationProgress >= 1) {
        this.isAnimating = false;
      }
    } else {
      this.animationProgress = Math.max(0, this.animationProgress - animationSpeed);
      if (this.animationProgress <= 0) {
        this.isAnimating = false;
      }
    }
    
    return this.isAnimating;
  }
  
  /**
   * Get button and menu positions/dimensions
   */
  private getLayout(ctx?: CanvasRenderingContext2D) {
    const buttonX = this.buttonPadding;
    // Fallback to a reasonable default if canvas height is 0
    const buttonY = (this.canvasHeight || 400) - this.buttonSize - this.buttonPadding;
    
    // Calculate menu dimensions when fully expanded
    // Measure text width for accurate menu width
    if (ctx) {
      ctx.font = 'bold 14px sans-serif';
      let maxTextWidth = 0;
      this.options.forEach(option => {
        const metrics = ctx.measureText(option.label);
        maxTextWidth = Math.max(maxTextWidth, metrics.width);
        
        // Also measure keybind if present (it's usually shorter, but check anyway)
        if (option.keybind) {
          ctx.font = '11px sans-serif';
          const keybindMetrics = ctx.measureText(option.keybind);
          maxTextWidth = Math.max(maxTextWidth, keybindMetrics.width);
          ctx.font = 'bold 14px sans-serif'; // Reset to label font
        }
      });
      this.cachedMenuWidth = maxTextWidth + this.optionPadding * 2 + this.menuMargin * 2;
    }
    
    const menuWidth = this.cachedMenuWidth;
    const menuHeight = (this.options.length * this.optionHeight) + this.menuMargin * 2;
    
    // Interpolate current dimensions based on progress
    const currentWidth = this.buttonSize + (menuWidth - this.buttonSize) * this.animationProgress;
    const currentHeight = this.buttonSize + (menuHeight - this.buttonSize) * this.animationProgress;
    
    // Menu expands upward
    const menuBottomY = buttonY + this.buttonSize;
    const menuTopY = menuBottomY - currentHeight;
    
    return {
      buttonX,
      buttonY,
      buttonSize: this.buttonSize,
      menuTopY,
      menuBottomY,
      currentWidth,
      currentHeight,
      menuWidth,
      menuHeight,
      optionStartY: menuTopY + this.menuMargin
    };
  }
  
  /**
   * Check if clicking the menu button
   */
  isClickingButton(mouseX: number, mouseY: number): boolean {
    const layout = this.getLayout();
    const centerX = layout.buttonX + layout.buttonSize / 2;
    const centerY = layout.buttonY + layout.buttonSize / 2;
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    
    return distance <= layout.buttonSize / 2;
  }
  
  /**
   * Get which option is being hovered (if any)
   */
  getHoveredOption(mouseX: number, mouseY: number): string | null {
    if (!this.isOpened || this.animationProgress <= 0.3 || this.canvasHeight === 0) {
      return null;
    }
    
    const layout = this.getLayout();
    
    for (let i = 0; i < this.options.length; i++) {
      const optionY = layout.optionStartY + (i * this.optionHeight);
      const optionLeft = layout.buttonX + this.optionPadding;
      const optionRight = layout.buttonX + layout.currentWidth - this.optionPadding;
      const optionTop = optionY;
      const optionBottom = optionY + this.optionHeight;
      
      if (
        mouseX >= optionLeft &&
        mouseX <= optionRight &&
        mouseY >= optionTop &&
        mouseY <= optionBottom
      ) {
        return this.options[i].id;
      }
    }
    
    return null;
  }
  
  /**
   * Get which option was clicked (if any)
   */
  getClickedOption(mouseX: number, mouseY: number): string | null {
    if (!this.isOpened || this.animationProgress <= 0.3) {
      return null;
    }
    
    return this.getHoveredOption(mouseX, mouseY);
  }
  
  /**
   * Render the menu
   */
  render(ctx: CanvasRenderingContext2D, canvasHeight: number, hoveredOptionId: string | null): void {
    this.canvasHeight = canvasHeight;
    const layout = this.getLayout(ctx);
    
    // Draw menu button background and expanded menu
    const gradient = ctx.createLinearGradient(layout.buttonX, layout.menuTopY, layout.buttonX + layout.currentWidth, layout.menuTopY + layout.currentHeight);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    this.drawRoundedRect(ctx, layout.buttonX, layout.menuTopY, layout.currentWidth, layout.currentHeight, 15);
    
    // Draw plus icon when closed or animation is early
    if (this.animationProgress < 0.3) {
      const centerX = layout.buttonX + layout.buttonSize / 2;
      const centerY = layout.buttonY + layout.buttonSize / 2;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - this.animationProgress * 5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 12);
      ctx.lineTo(centerX, centerY + 12);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(centerX - 12, centerY);
      ctx.lineTo(centerX + 12, centerY);
      ctx.stroke();
    } else {
      // Draw menu options
      this.options.forEach((option, index) => {
        const optionY = layout.optionStartY + (index * this.optionHeight);
        const isHovered = hoveredOptionId === option.id;
        
        // Draw option background only if hovered
        if (isHovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          this.drawRoundedRect(ctx, layout.buttonX + this.optionPadding, optionY, layout.currentWidth - this.optionPadding * 2, this.optionHeight, 6);
          
          // Draw a rounded border on hover
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          this.drawRoundedRectStroke(ctx, layout.buttonX + this.optionPadding, optionY, layout.currentWidth - this.optionPadding * 2, this.optionHeight, 6);
        }
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // If there's a keybind, shift the label up and add keybind below
        if (option.keybind) {
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(option.label, layout.buttonX + layout.currentWidth / 2, optionY + this.optionHeight / 2 - 7);
          
          ctx.font = '11px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(option.keybind, layout.buttonX + layout.currentWidth / 2, optionY + this.optionHeight / 2 + 8);
        } else {
          // No keybind, center the label
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(option.label, layout.buttonX + layout.currentWidth / 2, optionY + this.optionHeight / 2);
        }
      });
    }
  }
  
  /**
   * Helper to draw rounded rectangles
   */
  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Helper to stroke rounded rectangles
   */
  private drawRoundedRectStroke(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
  }

}