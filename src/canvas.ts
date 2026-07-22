/**
 * Canvas-based interactive timeline editor
 * Handles dragging, zooming, and visual rendering of timelines
 */

import { Arc, Branch, Chapter, Line, Textbox } from './types';
import { getChapterPositions, sortChapters } from './timelineLayout';
import { MenuSystem } from './menuSystem';
import { groupTimelineChaptersByArc } from './canvasArcGroups';
import { renderTextboxesToCanvas } from './textboxExportRenderer';
import { distanceToLineSegment, getResizeCursor, ResizeHandle } from './canvasGeometry';
import { drawEndpoint, renderLines } from './lineRenderer';
import { TextboxOverlayRenderer } from './textboxOverlayRenderer';

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

export interface CanvasSelectionDeletion {
  chapterIds: string[];
  branchIds: string[];
  textboxIds: string[];
  lineIds: string[];
}

export interface CanvasElements {
  textboxes: Textbox[];
  lines: Line[];
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
  private lastClickTime = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchPanStart: { x: number; y: number; offsetX: number; offsetY: number; distance: number; zoom: number } | null = null;
  private lastMultiTouchTap: { fingers: number; time: number } | null = null;
  private doubleTapInterval = 400;
  private onGestureUndo: (() => void) | null = null;
  private onGestureRedo: (() => void) | null = null;
  
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
  private selectedChapterIds = new Set<string>();
  private selectedBranchIds = new Set<string>();
  private selectedLineIds = new Set<string>();
  private selectedTimelineIds = new Set<string>();
  private selectionRect: { startX: number; startY: number; endX: number; endY: number } | null = null;
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
  private branches: Branch[] = [];
  
  // Arc data
  private timelineArcs = new Map<string, Arc[]>();
  
  // Textboxes
  private textboxes: Textbox[] = [];
  private selectedTextboxIds = new Set<string>();
  private elementClipboard: CanvasElements = { textboxes: [], lines: [] };
  private textboxOverlayContainer: HTMLElement | null = null;
  private textboxRenderer: TextboxOverlayRenderer;
  private isDraggingTextbox: boolean = false;
  private draggedTextboxId: string | null = null;
  private textboxDragStartX: number = 0;
  private textboxDragStartY: number = 0;
  private textboxOriginalX: number = 0;
  private textboxOriginalY: number = 0;
  private selectedTextboxDragOrigins = new Map<string, { x: number; y: number }>();
  private isResizingTextbox: boolean = false;
  private resizedTextboxId: string | null = null;
  // @ts-ignore - kept for reference but captured locally in closure now
  private resizeHandle: ResizeHandle | null = null;
  private resizeStartX: number = 0;
  private resizeStartY: number = 0;
  private resizeOriginalWidth: number = 0;
  private resizeOriginalHeight: number = 0;
  private hoveredTextboxId: string | null = null; // For hover state

  // Lines
  private lines: Line[] = [];
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
  private selectedLineDragOrigins = new Map<string, { gridX1: number; gridY1: number; gridX2: number; gridY2: number }>();
  
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
  private onAddBranchToNewTimeline: ((startTimelineId: string, startPosition: number, x: number, y: number) => void) | null = null;
  private onAddChapterToNewTimeline: ((x: number, y: number) => void) | null = null;
  private onAddTextbox: ((x: number, y: number) => void) | null = null;
  private onAddShape: ((x: number, y: number) => void) | null = null;
  private onAddImage: ((x: number, y: number) => void) | null = null;
  private onDeleteSelection: ((selection: CanvasSelectionDeletion) => void) | null = null;
  private onPasteSelection: ((elements: CanvasElements) => void) | null = null;
  private imageCache = new Map<string, HTMLImageElement>();
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
  private onLinesMoved: ((lines: Line[]) => void) | null = null;
  private getStateChaptersForTimeline: ((timelineId: string) => Chapter[]) | null = null;
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
    this.textboxRenderer = new TextboxOverlayRenderer(this.textboxOverlayContainer);
    
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
    this.canvas.style.touchAction = 'none';
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
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.insertionMode && !this.branchInsertionMode && !this.lineInsertionMode) return;
      this.insertionMode = false;
      this.branchInsertionMode = false;
      this.lineInsertionMode = false;
      this.branchFirstPoint = null;
      this.lineFirstPoint = null;
      this.hoveredInsertionPoint = { timelineId: null, position: -1 };
      this.branchHoveredPoint = { timelineId: null, position: -1 };
      this.lineHoveredPoint = null;
      this.canvas.style.cursor = 'grab';
      e.preventDefault();
      this.render();
    });
    document.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      const modifier = e.metaKey || e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.selectedTextboxIds = new Set(this.textboxes.map(textbox => textbox.id));
        this.selectedLineIds = new Set(this.lines.map(line => line.id));
        this.selectedBranchIds = new Set(this.branches.map(branch => branch.id));
        this.selectedChapterIds = new Set(this.timelines.flatMap(timeline => (timeline.chapters ?? []).filter(chapter => chapter.title !== 'Head' && chapter.title !== 'Tail').map(chapter => chapter.id)));
        this.selectedTimelineIds = new Set(this.timelines.map(timeline => timeline.id));
        this.render(); return;
      }
      if (modifier && e.key.toLowerCase() === 'c' && this.hasSelection()) {
        e.preventDefault();
        this.elementClipboard = {
          textboxes: this.textboxes.filter(textbox => this.selectedTextboxIds.has(textbox.id)).map(textbox => ({ ...textbox })),
          lines: this.lines.filter(line => this.selectedLineIds.has(line.id)).map(line => ({ ...line })),
        };
        return;
      }
      if (modifier && e.key.toLowerCase() === 'x' && this.hasSelection()) {
        e.preventDefault();
        this.elementClipboard = {
          textboxes: this.textboxes.filter(textbox => this.selectedTextboxIds.has(textbox.id)).map(textbox => ({ ...textbox })),
          lines: this.lines.filter(line => this.selectedLineIds.has(line.id)).map(line => ({ ...line })),
        };
        this.onDeleteSelection?.({ chapterIds: [...this.selectedChapterIds], branchIds: [...this.selectedBranchIds], textboxIds: [...this.selectedTextboxIds], lineIds: [...this.selectedLineIds] });
        this.clearSelection(); return;
      }
      if (modifier && e.key.toLowerCase() === 'v' && (this.elementClipboard.textboxes.length || this.elementClipboard.lines.length)) {
        e.preventDefault();
        const id = () => `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        const textboxes = this.elementClipboard.textboxes.map(textbox => ({ ...textbox, id: id(), x: textbox.x + 20, y: textbox.y + 20 }));
        const lines = this.elementClipboard.lines.map(line => ({ ...line, id: id(), gridX1: line.gridX1 + 1, gridY1: line.gridY1 + 1, gridX2: line.gridX2 + 1, gridY2: line.gridY2 + 1 }));
        this.clearSelection();
        this.selectedTextboxIds = new Set(textboxes.map(textbox => textbox.id));
        this.selectedLineIds = new Set(lines.map(line => line.id));
        this.onPasteSelection?.({ textboxes, lines }); return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.hasSelection()) {
        e.preventDefault();
        this.onDeleteSelection?.({ chapterIds: [...this.selectedChapterIds], branchIds: [...this.selectedBranchIds], textboxIds: [...this.selectedTextboxIds], lineIds: [...this.selectedLineIds] });
        this.clearSelection(); this.render();
      }
    });

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

    // Touch reuses the mouse interaction model for one-finger tap/long-press
    // while two fingers provide direct pan and pinch-zoom canvas navigation.
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX; this.touchStartY = touch.clientY;
        this.canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: touch.clientX, clientY: touch.clientY }));
      } else if (e.touches.length === 2) {
        const [first, second] = [e.touches[0], e.touches[1]];
        const x = (first.clientX + second.clientX) / 2, y = (first.clientY + second.clientY) / 2;
        this.touchPanStart = { x, y, offsetX: this.offsetX, offsetY: this.offsetY, distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY), zoom: this.zoom };
        if (this.dragDelayTimer) { clearTimeout(this.dragDelayTimer); this.dragDelayTimer = null; }
        this.pendingDragTimelineId = null; this.pendingDragChapterId = null; this.pendingDragTextboxId = null;
        this.isDragging = false;
      } else if (e.touches.length === 3) {
        this.touchPanStart = null;
      }
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && !this.touchPanStart) {
        const touch = e.touches[0];
        this.canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: touch.clientX, clientY: touch.clientY }));
      } else if (e.touches.length === 2 && this.touchPanStart) {
        const [first, second] = [e.touches[0], e.touches[1]];
        const x = (first.clientX + second.clientX) / 2, y = (first.clientY + second.clientY) / 2;
        const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
        const nextZoom = Math.max(0.5, Math.min(3, this.touchPanStart.zoom * distance / this.touchPanStart.distance));
        this.offsetX = this.touchPanStart.offsetX + (x - this.touchPanStart.x) - (x - this.touchPanStart.x) * (nextZoom / this.touchPanStart.zoom - 1);
        this.offsetY = this.touchPanStart.offsetY + (y - this.touchPanStart.y) - (y - this.touchPanStart.y) * (nextZoom / this.touchPanStart.zoom - 1);
        this.zoom = nextZoom; this.render();
      }
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const fingers = e.changedTouches.length + e.touches.length;
      if (fingers >= 2) {
        const now = Date.now();
        if (this.lastMultiTouchTap?.fingers === fingers && now - this.lastMultiTouchTap.time <= this.doubleTapInterval) {
          if (fingers === 2) this.onGestureUndo?.();
          if (fingers === 3) this.onGestureRedo?.();
          this.lastMultiTouchTap = null;
        } else this.lastMultiTouchTap = { fingers, time: now };
        this.touchPanStart = null;
        return;
      }
      if (this.touchPanStart) { this.touchPanStart = null; return; }
      this.canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: this.touchStartX, clientY: this.touchStartY }));
    }, { passive: false });

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
          } else if (clickedOptionId === 'new-shape' && this.onAddShape) {
            const centerX = (this.canvas.width / 2 - this.offsetX) / this.zoom;
            const centerY = (this.canvas.height / 2 - this.offsetY) / this.zoom;
            this.onAddShape(centerX, centerY);
          } else if (clickedOptionId === 'new-image' && this.onAddImage) {
            const centerX = (this.canvas.width / 2 - this.offsetX) / this.zoom;
            const centerY = (this.canvas.height / 2 - this.offsetY) / this.zoom;
            this.onAddImage(centerX, centerY);
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
            const point = this.getValidTimelineCreationPoint(mouseX, mouseY);
            if (point && this.onAddChapterToNewTimeline) {
              this.onAddChapterToNewTimeline(point.x, point.y);
            }
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
            const point = this.branchFirstPoint && this.getValidTimelineCreationPoint(mouseX, mouseY);
            if (point && this.branchFirstPoint && this.onAddBranchToNewTimeline) {
              this.onAddBranchToNewTimeline(this.branchFirstPoint.timelineId, this.branchFirstPoint.position, point.x, point.y);
            }
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

        // Check for double-click on timeline title. Modifier clicks are selection-only.
        const now = Date.now();
        const isDoubleClick = now - this.lastClickTime < 300
          && Math.abs(mouseX - this.lastClickX) < 10
          && Math.abs(mouseY - this.lastClickY) < 10;
        this.lastClickTime = now;
        this.lastClickX = mouseX;
        this.lastClickY = mouseY;

        if (isDoubleClick && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
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

        const clickedBranchId = this.getClickedBranch(mouseX, mouseY);
        if (clickedBranchId) {
          if (e.shiftKey) this.selectedBranchIds.add(clickedBranchId);
          else if (e.metaKey || e.ctrlKey) this.selectedBranchIds.delete(clickedBranchId);
          else this.selectOnly(this.selectedBranchIds, clickedBranchId);
          this.render();
          return;
        }

        const clickedLineId = this.getClickedLine(mouseX, mouseY);
        if (clickedLineId) {
          if (e.shiftKey) this.selectedLineIds.add(clickedLineId);
          else if (e.metaKey || e.ctrlKey) this.selectedLineIds.delete(clickedLineId);
          else this.selectOnly(this.selectedLineIds, clickedLineId);
          this.render();
        }

        // Check if clicking on draggable timeline element (title, head, or tail)
        // Use a small delay before starting drag to allow double-click detection
        const draggableElement = this.isDraggableTimelineElement(mouseX, mouseY);
        if (draggableElement?.isDraggable) {
          if (e.shiftKey) this.selectedTimelineIds.add(draggableElement.timelineId);
          else if (e.metaKey || e.ctrlKey) this.selectedTimelineIds.delete(draggableElement.timelineId);
          else this.selectOnly(this.selectedTimelineIds, draggableElement.timelineId);
          this.render();
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
          if (e.shiftKey) this.selectedChapterIds.add(draggableChapter.chapterId);
          else if (e.metaKey || e.ctrlKey) this.selectedChapterIds.delete(draggableChapter.chapterId);
          else this.selectOnly(this.selectedChapterIds, draggableChapter.chapterId);
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
          if (e.shiftKey) this.selectedTextboxIds.add(textboxClickResult.textboxId);
          else if (e.metaKey || e.ctrlKey) this.selectedTextboxIds.delete(textboxClickResult.textboxId);
          else this.selectOnly(this.selectedTextboxIds, textboxClickResult.textboxId);
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
            this.canvas.style.cursor = getResizeCursor(textboxClickResult.handle as ResizeHandle);
            
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
                this.canvas.style.cursor = getResizeCursor(resizeHandle as ResizeHandle);
                // Convert screen delta to world delta
                const worldDeltaX = deltaX / this.zoom;
                const worldDeltaY = deltaY / this.zoom;
                
                if (e.altKey) {
                  // Always use the dimensions captured at drag start. This lets Alt
                  // lock the original ratio even when it is pressed partway through a drag.
                  const ratio = this.resizeOriginalWidth / this.resizeOriginalHeight;
                  const horizontalChange = resizeHandle.includes('e') ? worldDeltaX : resizeHandle.includes('w') ? -worldDeltaX : 0;
                  const verticalChange = resizeHandle.includes('s') ? worldDeltaY : resizeHandle.includes('n') ? -worldDeltaY : 0;
                  const useHorizontal = !resizeHandle.match(/[ns]/) || (resizeHandle.match(/[ew]/) && Math.abs(horizontalChange / ratio) >= Math.abs(verticalChange));
                  const width = useHorizontal
                    ? Math.max(50, this.resizeOriginalWidth + horizontalChange)
                    : Math.max(50, (this.resizeOriginalHeight + verticalChange) * ratio);
                  const height = Math.max(30, width / ratio);
                  textbox.width = width;
                  textbox.height = height;
                  textbox.x = resizeHandle.includes('w') ? this.textboxOriginalX + this.resizeOriginalWidth - width : this.textboxOriginalX;
                  textbox.y = resizeHandle.includes('n') ? this.textboxOriginalY + this.resizeOriginalHeight - height : this.textboxOriginalY;
                } else {
                  // Freeform resize when Alt is not held.
                  if (resizeHandle.includes('e')) {
                    textbox.width = Math.max(50, this.resizeOriginalWidth + worldDeltaX);
                  } else if (resizeHandle.includes('w')) {
                    const newWidth = Math.max(50, this.resizeOriginalWidth - worldDeltaX);
                    textbox.x = this.textboxOriginalX + this.resizeOriginalWidth - newWidth;
                    textbox.width = newWidth;
                  }
                  if (resizeHandle.includes('s')) {
                    textbox.height = Math.max(30, this.resizeOriginalHeight + worldDeltaY);
                  } else if (resizeHandle.includes('n')) {
                    const newHeight = Math.max(30, this.resizeOriginalHeight - worldDeltaY);
                    textbox.y = this.textboxOriginalY + this.resizeOriginalHeight - newHeight;
                    textbox.height = newHeight;
                  }
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
              if (!this.selectedTextboxIds.has(textbox.id)) this.selectedTextboxIds = new Set([textbox.id]);
              this.selectedTextboxDragOrigins = new Map(
                this.textboxes.filter(item => this.selectedTextboxIds.has(item.id)).map(item => [item.id, { x: item.x, y: item.y }]),
              );
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
            if (!this.selectedLineIds.has(line.id)) this.selectOnly(this.selectedLineIds, line.id);
            this.selectedLineDragOrigins = new Map(this.lines.filter(candidate => this.selectedLineIds.has(candidate.id)).map(candidate => [candidate.id, {
              gridX1: candidate.gridX1, gridY1: candidate.gridY1, gridX2: candidate.gridX2, gridY2: candidate.gridY2,
            }]));

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
                  
                  if (this.draggedLineId) {
                    const gridSize = this.gridSize;
                    const deltaGridX = Math.round(deltaX / this.zoom / gridSize);
                    const deltaGridY = Math.round(deltaY / this.zoom / gridSize);
                    
                    for (const [id, origin] of this.selectedLineDragOrigins) {
                      const selected = this.lines.find(candidate => candidate.id === id);
                      if (!selected) continue;
                      selected.gridX1 = origin.gridX1 + deltaGridX;
                      selected.gridY1 = origin.gridY1 + deltaGridY;
                      selected.gridX2 = origin.gridX2 + deltaGridX;
                      selected.gridY2 = origin.gridY2 + deltaGridY;
                    }
                    this.render();
                  }
                };
                
                const handleDocumentMouseUp = () => {
                  document.removeEventListener('mousemove', handleDocumentMouseMove);
                  document.removeEventListener('mouseup', handleDocumentMouseUp);
                  
                  if (this.isDraggingLine && this.selectedLineDragOrigins.size) {
                    this.onLinesMoved?.(this.lines.filter(line => this.selectedLineDragOrigins.has(line.id)).map(line => ({ ...line })));
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
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          this.selectionRect = { startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY };
          this.isDragging = false;
          return;
        }
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) this.clearSelection();
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
      } else if (this.selectionRect) {
        this.selectionRect.endX = mouseX;
        this.selectionRect.endY = mouseY;
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
          
          for (const [id, origin] of this.selectedTextboxDragOrigins) {
            const selected = this.textboxes.find(item => item.id === id);
            if (selected) { selected.x = origin.x + worldDeltaX; selected.y = origin.y + worldDeltaY; }
          }
          this.render();
        }
      } else if (this.isResizingTextbox) {
        // During active resize, keep cursor and hover stable
        this.canvas.style.cursor = this.resizeHandle ? getResizeCursor(this.resizeHandle) : 'grab';
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
            this.canvas.style.cursor = getResizeCursor(textboxClickResult.handle as ResizeHandle);
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

    this.canvas.addEventListener('mouseup', (e) => {
      if (this.selectionRect) {
        const left = Math.min(this.selectionRect.startX, this.selectionRect.endX), right = Math.max(this.selectionRect.startX, this.selectionRect.endX);
        const top = Math.min(this.selectionRect.startY, this.selectionRect.endY), bottom = Math.max(this.selectionRect.startY, this.selectionRect.endY);
        const remove = e.metaKey || e.ctrlKey;
        const apply = (ids: Set<string>, id: string) => remove ? ids.delete(id) : ids.add(id);
        for (const textbox of this.textboxes) {
          const x = textbox.x * this.zoom + this.offsetX, y = textbox.y * this.zoom + this.offsetY;
          if (x >= left && x + textbox.width * this.zoom <= right && y >= top && y + textbox.height * this.zoom <= bottom) apply(this.selectedTextboxIds, textbox.id);
        }
        for (const timeline of this.timelines) for (const chapter of timeline.chapters ?? []) {
          if (chapter.title === 'Head' || chapter.title === 'Tail') continue;
          const x = timeline.x * this.zoom + this.offsetX + chapter.x * this.gridSize * this.zoom;
          const y = timeline.y * this.zoom + this.offsetY;
          if (x >= left && x + chapter.width * this.gridSize * this.zoom <= right && y - 28 >= top && y + 12 <= bottom) apply(this.selectedChapterIds, chapter.id);
        }
        for (const line of this.lines) {
          const x1 = line.gridX1 * this.gridSize * this.zoom + this.offsetX, y1 = line.gridY1 * this.gridSize * this.zoom + this.offsetY;
          const x2 = line.gridX2 * this.gridSize * this.zoom + this.offsetX, y2 = line.gridY2 * this.gridSize * this.zoom + this.offsetY;
          if (Math.min(x1, x2) >= left && Math.max(x1, x2) <= right && Math.min(y1, y2) >= top && Math.max(y1, y2) <= bottom) apply(this.selectedLineIds, line.id);
        }
        this.selectionRect = null;
        this.render();
      }
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

  /** Refresh canvas content without reconstructing the surrounding application UI. */
  refresh(): void {
    this.render();
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

  addTimeline(id: string, name: string = 'Timeline', x?: number, y?: number, headGridLength: number = 1, tailGridLength: number = 1): void {
    // Use provided positions, default to 0 if not provided (for backwards compatibility)
    const xPosition = x !== undefined ? x : 0;
    const yPosition = y !== undefined ? y : 0;
    
    // Initialize with head and tail chapters (2 units each)
    const headChapter: TimelineChapter = {
      id: `${id}-head`,
      title: 'Head',
      x: 0,
      width: Math.max(1, headGridLength)
    };
    
    const tailChapter: TimelineChapter = {
      id: `${id}-tail`,
      title: 'Tail',
      x: Math.max(1, headGridLength),
      width: Math.max(1, tailGridLength)
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

  updateTimelineName(id: string, name: string): void {
    const timeline = this.timelines.find(candidate => candidate.id === id);
    if (!timeline) return;

    timeline.name = name;
    this.render();
  }

  updateTimelineEndpointLengths(id: string, headGridLength: number = 1, tailGridLength: number = 1): void {
    const timeline = this.timelines.find(candidate => candidate.id === id);
    if (!timeline?.chapters) return;
    const head = timeline.chapters.find(chapter => chapter.title === 'Head');
    const tail = timeline.chapters.find(chapter => chapter.title === 'Tail');
    if (head) head.width = Math.max(1, headGridLength);
    if (tail) tail.width = Math.max(1, tailGridLength);
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

  setOnAddBranchToNewTimeline(callback: (startTimelineId: string, startPosition: number, x: number, y: number) => void): void {
    this.onAddBranchToNewTimeline = callback;
  }

  setOnAddChapterToNewTimeline(callback: (x: number, y: number) => void): void {
    this.onAddChapterToNewTimeline = callback;
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

  setGetStateChaptersCallback(callback: (timelineId: string) => Chapter[]): void {
    this.getStateChaptersForTimeline = callback;
  }

  setOnAddTextbox(callback: (x: number, y: number) => void): void {
    this.onAddTextbox = callback;
  }

  setOnAddShape(callback: (x: number, y: number) => void): void {
    this.onAddShape = callback;
  }

  setOnAddImage(callback: (x: number, y: number) => void): void {
    this.onAddImage = callback;
  }

  setOnHistoryGestures(undo: () => void, redo: () => void): void {
    this.onGestureUndo = undo;
    this.onGestureRedo = redo;
  }

  setDoubleTapSpeed(speed: 'faster' | 'fast' | 'slow' | undefined): void {
    this.doubleTapInterval = speed === 'faster' ? 250 : speed === 'slow' ? 600 : 400;
  }

  setOnSelectionDelete(callback: (selection: CanvasSelectionDeletion) => void): void {
    this.onDeleteSelection = callback;
  }

  setOnSelectionPaste(callback: (elements: CanvasElements) => void): void {
    this.onPasteSelection = callback;
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

  setOnLinesMoved(callback: (lines: Line[]) => void): void {
    this.onLinesMoved = callback;
  }

  setTextboxes(textboxes: Textbox[]): void {
    this.textboxes = textboxes;
    this.render();
  }

  setLines(lines: Line[]): void {
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
    renderTextboxesToCanvas(tempCtx, this.textboxes, this.zoom, this.offsetX, this.offsetY);

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

  setBranches(branches: Branch[]): void {
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


  updateTimelineArcs(timelineId: string, arcs: Arc[]): void {
    this.timelineArcs.set(timelineId, arcs);
    this.render();
  }

  updateTimelineChaptersWithArcs(timelineId: string, chapters: Chapter[], arcs: Arc[]): void {
    this.updateTimelineArcs(timelineId, arcs);
    this.updateTimelineChapters(timelineId, chapters);
  }

  /**
   * Update chapters for a timeline from state data
   * Converts Chapter model into TimelineChapter visualization
   */
  updateTimelineChapters(timelineId: string, chapters: Chapter[]): void {
    const timeline = this.timelines.find(t => t.id === timelineId);
    if (!timeline) return;

    // Keep head and tail chapters, reconstruct middle chapters
    const headChapter = timeline.chapters?.find(ch => ch.title === 'Head');
    const tailChapter = timeline.chapters?.find(ch => ch.title === 'Tail');

    const visualChapters: TimelineChapter[] = [];
    
    if (headChapter) visualChapters.push(headChapter);

    // Convert state chapters to visual chapters
    // Sort by timestamp to maintain order
    const sortedChapters = sortChapters(chapters);
    const headGridLength = headChapter?.width ?? 1;
    const positions = getChapterPositions(sortedChapters, headGridLength);

    sortedChapters.forEach((chapter) => {
      const position = positions.get(chapter.id)!;
      const visualChapter: TimelineChapter = {
        id: chapter.id,
        title: chapter.title,
        x: position.x,
        width: position.width,
        arcId: chapter.arcId
      };
      visualChapters.push(visualChapter);
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

    if (this.selectionRect) {
      const { startX, startY, endX, endY } = this.selectionRect;
      this.ctx.save(); this.ctx.strokeStyle = '#1976d2'; this.ctx.fillStyle = 'rgba(25,118,210,0.12)'; this.ctx.setLineDash([6,4]);
      this.ctx.fillRect(Math.min(startX,endX), Math.min(startY,endY), Math.abs(endX-startX), Math.abs(endY-startY));
      this.ctx.strokeRect(Math.min(startX,endX), Math.min(startY,endY), Math.abs(endX-startX), Math.abs(endY-startY)); this.ctx.restore();
    }

    // Draw lines
    renderLines(this.ctx, this.lines, {
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      gridSize: this.gridSize,
      zoom: this.zoom,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    }, {
      enabled: this.lineInsertionMode,
      firstPoint: this.lineFirstPoint,
      hoveredPoint: this.lineHoveredPoint,
    }, this.selectedLineIds);

    // Draw textboxes (skip DOM overlay when suppressed, e.g., offscreen export)
    this.drawTextboxShapes();
    this.drawEmbeddedImages();
    if (!this.suppressTextboxRender) {
      this.textboxRenderer.render(this.textboxes, {
        zoom: this.zoom,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      }, this.hoveredTextboxId, this.selectedTextboxIds);
    }

    // Draw menu on separate canvas unless suppressed (e.g., during PNG export)
    if (!this.suppressMenuRender) {
      this.renderMenuCanvas();
    }
  }

  private clearSelection(): void {
    this.selectedChapterIds.clear();
    this.selectedBranchIds.clear();
    this.selectedLineIds.clear();
    this.selectedTextboxIds.clear();
    this.selectedTimelineIds.clear();
  }

  private hasSelection(): boolean {
    return this.selectedChapterIds.size > 0 || this.selectedBranchIds.size > 0 || this.selectedLineIds.size > 0 || this.selectedTextboxIds.size > 0 || this.selectedTimelineIds.size > 0;
  }

  /** A plain click starts a new selection; modifiers alter the existing group. */
  private selectOnly(ids: Set<string>, id: string): void {
    this.clearSelection();
    ids.add(id);
  }

  private drawTextboxShapes(): void {
    for (const textbox of this.textboxes) {
      if (!textbox.shapeType) continue;
      const x = textbox.x * this.zoom + this.offsetX;
      const y = textbox.y * this.zoom + this.offsetY;
      const width = textbox.width * this.zoom;
      const height = textbox.height * this.zoom;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(102, 126, 234, 0.15)';
      this.ctx.strokeStyle = '#667eea';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      if (textbox.shapeType === 'circle') this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      else if (textbox.shapeType === 'triangle') {
        this.ctx.moveTo(x + width / 2, y); this.ctx.lineTo(x + width, y + height); this.ctx.lineTo(x, y + height); this.ctx.closePath();
      } else this.ctx.rect(x, y, width, height);
      this.ctx.fill(); this.ctx.stroke(); this.ctx.restore();
    }
  }

  private drawEmbeddedImages(): void {
    for (const textbox of this.textboxes) {
      if (!textbox.imageDataUrl) continue;
      let image = this.imageCache.get(textbox.id);
      if (!image || image.src !== textbox.imageDataUrl) {
        image = new Image();
        image.src = textbox.imageDataUrl;
        image.onload = () => this.render();
        this.imageCache.set(textbox.id, image);
      }
      if (!image.complete || !image.naturalWidth) continue;
      this.ctx.drawImage(image, textbox.x * this.zoom + this.offsetX, textbox.y * this.zoom + this.offsetY, textbox.width * this.zoom, textbox.height * this.zoom);
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

      if (this.selectedTimelineIds.has(timeline.id)) {
        const lastChapter = timeline.chapters?.[timeline.chapters.length - 1];
        const width = Math.max(this.gridSize * 2 * this.zoom, ((lastChapter?.x ?? 1) + (lastChapter?.width ?? 1)) * chapterSegmentWidth + 20);
        this.ctx.save();
        this.ctx.strokeStyle = '#1976d2';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 4]);
        this.ctx.strokeRect(screenX - 6, screenY - 48, width + 12, 66);
        this.ctx.restore();
      }

      const arcGroups = groupTimelineChaptersByArc(timeline.chapters);
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
          if (this.selectedChapterIds.has(chapter.id)) {
            this.ctx.save();
            this.ctx.strokeStyle = '#1976d2';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 3]);
            this.ctx.strokeRect(chapterScreenX - 3, screenY - 28, chapterScreenWidth + 6, 40);
            this.ctx.restore();
          }
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
        const arcGroups = groupTimelineChaptersByArc(timeline.chapters);

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
   * Return a grid-aligned empty location suitable for a newly created timeline.
   * A new timeline begins as a two-grid-unit segment; its full visual height is
   * included here so it cannot be created on top of an existing timeline.
   */
  private getValidTimelineCreationPoint(mouseX: number, mouseY: number): { x: number; y: number } | null {
    const x = Math.round(((mouseX - this.offsetX) / this.zoom) / this.gridSize) * this.gridSize;
    const y = Math.round(((mouseY - this.offsetY) / this.zoom) / this.gridSize) * this.gridSize;
    const candidate = { left: x, right: x + this.gridSize * 2, top: y - this.timelineHeight / 2, bottom: y + this.timelineHeight / 2 };
    const overlaps = this.timelines.some(timeline => {
      const finalChapter = timeline.chapters?.[timeline.chapters.length - 1];
      const width = Math.max(this.gridSize * 2, ((finalChapter?.x ?? 1) + (finalChapter?.width ?? 1)) * this.gridSize);
      const existing = { left: timeline.x, right: timeline.x + width, top: timeline.y - this.timelineHeight / 2, bottom: timeline.y + this.timelineHeight / 2 };
      return candidate.left < existing.right && candidate.right > existing.left && candidate.top < existing.bottom && candidate.bottom > existing.top;
    });
    return overlaps ? null : { x, y };
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
        // Check HEAD position (position 0 - before first chapter)
        const headX = screenX;
        const headDistance = Math.sqrt(Math.pow(mouseX - headX, 2) + Math.pow(mouseY - screenY, 2));
        if (headDistance < hitRadius) {
          return { timelineId: timeline.id, gridPosition: 0 };
        }

        // Check insertion points between chapters
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

        // Check TAIL position (position after last chapter)
        if (timeline.chapters.length > 0) {
          const lastChapter = timeline.chapters[timeline.chapters.length - 1];
          const tailGridPosition = lastChapter.x + lastChapter.width;
          const tailX = screenX + (tailGridPosition * chapterSegmentWidth);
          const tailDistance = Math.sqrt(Math.pow(mouseX - tailX, 2) + Math.pow(mouseY - screenY, 2));
          if (tailDistance < hitRadius) {
            return { timelineId: timeline.id, gridPosition: tailGridPosition };
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
      this.ctx.strokeStyle = this.selectedBranchIds.has(branch.id) ? '#1976d2' : '#000000';
      this.ctx.lineWidth = Math.max(1, branch.lineWidth ?? 3);
      
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
      drawEndpoint(this.ctx, startScreenX, startScreenY, startStyle, startScreenX - 1, startScreenY);
      drawEndpoint(this.ctx, endScreenX, endScreenY, endStyle, endScreenX - 1, endScreenY);
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
      const arcGroups = groupTimelineChaptersByArc(timeline.chapters);

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
      const arcGroups = groupTimelineChaptersByArc(timeline.chapters);

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
    for (const line of this.lines) {
      const screenX1 = line.gridX1 * this.gridSize * this.zoom + this.offsetX;
      const screenY1 = line.gridY1 * this.gridSize * this.zoom + this.offsetY;
      const screenX2 = line.gridX2 * this.gridSize * this.zoom + this.offsetX;
      const screenY2 = line.gridY2 * this.gridSize * this.zoom + this.offsetY;

      // Check distance from point to line segment
      const distance = distanceToLineSegment(mouseX, mouseY, screenX1, screenY1, screenX2, screenY2);
      if (distance <= Math.max(8, (line.lineWidth ?? 2) / 2 + 4)) {
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

  dispose(): void {
    this.canvas.remove();
  }
}
