import { marked } from 'marked';
import type { Textbox } from './types';

export interface TextboxOverlayViewport {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/** Manages the DOM overlay used to display markdown textboxes on the canvas. */
export class TextboxOverlayRenderer {
  private elements = new Map<string, HTMLElement>();

  constructor(private readonly container: HTMLElement) {}

render(textboxes: Textbox[], viewport: TextboxOverlayViewport, hoveredTextboxId: string | null, selectedTextboxIds: ReadonlySet<string> = new Set()): void {
  // Create or update HTML elements for each textbox
  const existingIds = new Set(this.elements.keys());
  const currentIds = new Set(textboxes.map(t => t.id));
  
  // Remove textboxes that no longer exist
  for (const id of existingIds) {
    if (!currentIds.has(id)) {
      const element = this.elements.get(id);
      if (element) {
        element.remove();
        this.elements.delete(id);
      }
    }
  }
  
  // Create or update textbox elements
  for (const textbox of textboxes) {
    const screenX = textbox.x + viewport.offsetX / viewport.zoom;
    const screenY = textbox.y + viewport.offsetY / viewport.zoom;
    
    let element = this.elements.get(textbox.id);
    
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
      
      this.container?.appendChild(element);
      this.elements.set(textbox.id, element);
    }
    
    // Update position and size. Rotated shapes scale around their center, so
    // compensate the unscaled DOM box to keep it aligned with the canvas shape.
    const screenLeft = screenX * viewport.zoom;
    const screenTop = screenY * viewport.zoom;
    element.style.left = (screenLeft + (textbox.shapeType ? textbox.width * (viewport.zoom - 1) / 2 : 0)) + 'px';
    element.style.top = (screenTop + (textbox.shapeType ? textbox.height * (viewport.zoom - 1) / 2 : 0)) + 'px';
    element.style.width = textbox.width + 'px';
    element.style.height = textbox.height + 'px';
    const rotation = textbox.shapeType ? (textbox.rotation ?? 0) : 0;
    element.style.transform = `scale(${viewport.zoom}) rotate(${rotation}deg)`;
    element.style.transformOrigin = textbox.shapeType ? 'center center' : 'top left';
    // Font size stays at model value - CSS scale handles zoom uniformly
    element.style.fontSize = textbox.fontSize + 'px';
    element.style.lineHeight = (textbox.fontSize * 1.4) + 'px';
    
    // Apply text alignment (horizontal) and fixed vertical alignment via flexbox
    const textAlign = textbox.alignX || (textbox.shapeType ? 'center' : 'left');
    element.style.textAlign = textAlign;
    const verticalAlign = textbox.alignY || (textbox.shapeType ? 'middle' : 'top');
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.justifyContent = verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
    element.style.paddingTop = '8px';
    element.style.paddingBottom = '8px';
    element.style.overflow = textbox.shapeType ? 'hidden' : 'auto';
    element.style.clipPath = textbox.shapeType === 'circle'
      ? 'ellipse(50% 50% at 50% 50%)'
      : textbox.shapeType === 'triangle'
        ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
        : textbox.shapeType === 'square' ? 'inset(0)' : 'none';
    
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
      if (!textbox.shapeType && contentHeight > textbox.height + 2) {
        textbox.height = contentHeight;
      }
    }
    
    // Update hover state
    if (selectedTextboxIds.has(textbox.id)) {
      element.style.borderColor = '#1976d2';
      element.style.borderStyle = 'solid';
    } else if (hoveredTextboxId === textbox.id) {
      element.style.borderColor = 'rgba(100, 150, 255, 0.6)';
      element.style.borderStyle = 'solid';
    } else {
      element.style.borderColor = 'transparent';
    }
  }
}
}
