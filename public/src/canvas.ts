/**
 * Canvas-based interactive timeline editor
 * Handles dragging, zooming, and visual rendering of timelines
 */

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
}

export class TimelineCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
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
  
  // Timelines
  private timelines: TimelinePosition[] = [];
  private timelineHeight: number = 200;
  
  
  // Menu system
  private menu: MenuSystem;
  private hoveredMenuOptionId: string | null = null;
  
  // Chapter insertion mode
  private insertionMode: boolean = false;
  private hoveredInsertionPoint: { timelineId: string | null; position: number } = { timelineId: null, position: -1 };
  
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
  
  // Callbacks
  private onAddTimeline: (() => void) | null = null;
  private onAddChapter: ((timelineId: string, position: number) => void) | null = null;
  private onEditTimeline: ((timelineId: string) => void) | null = null;
  private onTimelineHovered: ((timelineId: string | null, position: 'above' | 'below') => void) | null = null;
  private onTimelineMoved: ((timelineId: string, x: number, y: number) => void) | null = null;
  private hoveredInsertZone: { timelineId: string | null; position: 'above' | 'below' } = { timelineId: null, position: 'below' };

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
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
    this.container.appendChild(this.canvas);
    
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
          const clickedElement = this.getClickedTimelineOrChapter(mouseX, mouseY);
          if (clickedElement?.type === 'timeline-title' && this.onEditTimeline) {
            this.onEditTimeline(clickedElement.id);
            return;
          } else if (clickedElement?.type === 'chapter' && clickedElement.timelineId) {
            // Double-click on any chapter (including head/tail) opens timeline edit
            if (this.onEditTimeline) {
              this.onEditTimeline(clickedElement.timelineId);
            }
            return;
          }
        }

        // Check if clicking on draggable timeline element (title, head, or tail)
        const draggableElement = this.isDraggableTimelineElement(mouseX, mouseY);
        if (draggableElement?.isDraggable) {
          // Start timeline dragging
          this.isDraggingTimeline = true;
          this.draggedTimelineId = draggableElement.timelineId;
          this.timelineDragStartX = mouseX;
          this.timelineDragStartY = mouseY;
          
          const timeline = this.timelines.find(t => t.id === draggableElement.timelineId);
          if (timeline) {
            this.timelineOriginalX = timeline.x;
            this.timelineOriginalY = timeline.y;
          }
          
          this.canvas.style.cursor = 'move';
          return;
        }

        // Start panning
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartOffsetX = this.offsetX;
        this.dragStartOffsetY = this.offsetY;
        this.canvas.style.cursor = 'grabbing';
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
        } else {
          // Check hover states
          this.updateHoverState(mouseX, mouseY);
          
          // Check if hovering over draggable timeline element
          const draggableElement = this.isDraggableTimelineElement(mouseX, mouseY);
          if (draggableElement?.isDraggable) {
            this.canvas.style.cursor = 'move';
          } else if (this.isClickingMenuButton(mouseX, mouseY)) {
            this.canvas.style.cursor = 'pointer';
          } else {
            this.canvas.style.cursor = 'grab';
          }
        }
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      // Save timeline position if we were dragging a timeline
      if (this.isDraggingTimeline && this.draggedTimelineId && this.onTimelineMoved) {
        const timeline = this.timelines.find(t => t.id === this.draggedTimelineId);
        if (timeline) {
          this.onTimelineMoved(timeline.id, timeline.x, timeline.y);
        }
      }
      
      this.isDragging = false;
      this.isDraggingTimeline = false;
      this.draggedTimelineId = null;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.isDraggingTimeline = false;
      this.draggedTimelineId = null;
      this.canvas.style.cursor = 'grab';
      this.hoveredInsertZone = { timelineId: null, position: 'below' };
      if (this.onTimelineHovered) {
        this.onTimelineHovered(null, 'below');
      }
      this.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
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

  setOnEditTimeline(callback: (timelineId: string) => void): void {
    this.onEditTimeline = callback;
  }

  setOnTimelineHovered(callback: (timelineId: string | null, position: 'above' | 'below') => void): void {
    this.onTimelineHovered = callback;
  }

  setOnTimelineMoved(callback: (timelineId: string, x: number, y: number) => void): void {
    this.onTimelineMoved = callback;
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

    // Draw menu
    this.menu.render(this.ctx, this.canvas.height, this.hoveredMenuOptionId);
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
    this.timelines.forEach(timeline => {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const screenWidth = timeline.width * this.zoom;
      const chapterSegmentWidth = this.gridSize * this.zoom; // One gridspace per chapter

      // Draw horizontal timeline line
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, screenY);
      this.ctx.lineTo(screenX + screenWidth, screenY);
      this.ctx.stroke();

      // Draw chapters/segments
      if (timeline.chapters) {
        timeline.chapters.forEach(chapter => {
          // Skip drawing boxes for Head and Tail chapters
          if (chapter.title === 'Head' || chapter.title === 'Tail') {
            return;
          }
          
          const chapterScreenX = screenX + (chapter.x * chapterSegmentWidth);
          const chapterScreenWidth = chapter.width * chapterSegmentWidth;
          const chapterHeight = 30;
          const chapterScreenY = screenY - chapterHeight;

          // Draw chapter segment background
          this.ctx.fillStyle = '#f0f0f0';
          this.ctx.fillRect(chapterScreenX, chapterScreenY, chapterScreenWidth, chapterHeight);

          // Draw chapter segment border
          this.ctx.strokeStyle = '#999999';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(chapterScreenX, chapterScreenY, chapterScreenWidth, chapterHeight);

          // Draw segment divider lines
          this.ctx.strokeStyle = '#cccccc';
          this.ctx.lineWidth = 1;
          for (let i = 1; i < chapter.width; i++) {
            const dividerX = chapterScreenX + (i * chapterSegmentWidth);
            this.ctx.beginPath();
            this.ctx.moveTo(dividerX, chapterScreenY);
            this.ctx.lineTo(dividerX, chapterScreenY + chapterHeight);
            this.ctx.stroke();
          }

          // Draw chapter title (skip for Head and Tail)
          if (chapter.title !== 'Head' && chapter.title !== 'Tail') {
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '12px sans-serif';
            this.ctx.textBaseline = 'middle';
            this.ctx.textAlign = 'center';
            
            // Truncate text if too long
            const maxTextWidth = chapterScreenWidth - 4;
            const textX = chapterScreenX + chapterScreenWidth / 2;
            const textY = chapterScreenY + chapterHeight / 2;
            
            let displayText = chapter.title;
            const metrics = this.ctx.measureText(displayText);
            if (metrics.width > maxTextWidth) {
              while (displayText.length > 0 && this.ctx.measureText(displayText + '...').width > maxTextWidth) {
                displayText = displayText.slice(0, -1);
              }
              displayText += '...';
            }
            this.ctx.fillText(displayText, textX, textY);
          }
        });
      }

      // Draw arrow at the end - dynamic based on last chapter
      const arrowSize = 12;
      let arrowStartX = screenX;
      let arrowEndX = screenX;
      
      // Arrow starts from after the last chapter and extends to the calculated width
      if (timeline.chapters && timeline.chapters.length > 0) {
        const lastChapter = timeline.chapters[timeline.chapters.length - 1];
        arrowStartX = screenX + ((lastChapter.x + lastChapter.width) * chapterSegmentWidth);
        arrowEndX = arrowStartX + 20; // Small gap after last chapter
      }
      
      const arrowY = screenY;
      
      // Draw line from last chapter to arrow
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(arrowStartX, arrowY);
      this.ctx.lineTo(arrowEndX - arrowSize, arrowY);
      this.ctx.stroke();
      
      // Draw arrow head
      this.ctx.fillStyle = '#333333';
      this.ctx.beginPath();
      this.ctx.moveTo(arrowEndX, arrowY);
      this.ctx.lineTo(arrowEndX - arrowSize, arrowY - arrowSize / 2);
      this.ctx.lineTo(arrowEndX - arrowSize, arrowY + arrowSize / 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Draw timeline title (clickable for editing)
      // Position to the left of timeline, right-aligned with fixed gap
      this.ctx.fillStyle = '#333333';
      this.ctx.font = '14px sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'right';
      const titleGap = 10; // Fixed distance from timeline start
      this.ctx.fillText(timeline.name, screenX - titleGap, screenY);
    });

    // Draw insertion mode indicators
    if (this.insertionMode) {
      this.drawInsertionIndicators();
    }
  }

  private drawInsertionIndicators(): void {
    this.timelines.forEach((timeline) => {
      const screenX = timeline.x * this.zoom + this.offsetX;
      const screenY = timeline.y * this.zoom + this.offsetY;
      const chapterSegmentWidth = this.gridSize * this.zoom;
      
      if (timeline.chapters && timeline.chapters.length > 0) {
        // Only show insertion point between head and tail
        const headChapter = timeline.chapters[0];
        const insertionX = screenX + ((headChapter.x + headChapter.width) * chapterSegmentWidth);
        
        const isHovered = this.hoveredInsertionPoint.timelineId === timeline.id &&
                         this.hoveredInsertionPoint.position === 1;
        
        // Always use green for all timelines
        this.ctx.fillStyle = isHovered ? '#00dd00' : 'rgba(0, 200, 0, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(insertionX, screenY, 10, 0, Math.PI * 2);
        this.ctx.fill();
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
        // Only insertion point is between head and tail (position 1)
        const headChapter = timeline.chapters[0];
        const insertionX = screenX + ((headChapter.x + headChapter.width) * chapterSegmentWidth);
        
        const distance = Math.sqrt(Math.pow(mouseX - insertionX, 2) + Math.pow(mouseY - screenY, 2));
        if (distance < hitRadius) {
          return { timelineId: timeline.id, position: 1 };
        }
      }
    }

    return { timelineId: null, position: -1 };
  }

  private getClickedInsertionPoint(mouseX: number, mouseY: number): { timelineId: string; position: number } | null {
    const result = this.getHoveredInsertionPoint(mouseX, mouseY);
    if (result.timelineId !== null && result.position >= 0) {
      return { timelineId: result.timelineId, position: result.position };
    }
    return null;
  }

  private getClickedTimelineOrChapter(mouseX: number, mouseY: number): { type: string; id: string; timelineId?: string } | null {
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
            return { type: 'chapter', id: chapter.id, timelineId: timeline.id };
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
      }
    }

    return null;
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
  
  private options: { id: string; label: string }[] = [
    { id: 'new-timeline', label: 'New Timeline' },
    { id: 'new-chapter', label: 'New Chapter' },
    { id: 'new-branch', label: 'New Branch' }
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
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(option.label, layout.buttonX + layout.currentWidth / 2, optionY + this.optionHeight / 2);
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