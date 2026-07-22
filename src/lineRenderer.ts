import type { Line } from './types';

export interface LineRendererViewport {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface GridPoint {
  gridX: number;
  gridY: number;
}

export function renderLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly Line[],
  viewport: LineRendererViewport,
  insertion: { enabled: boolean; firstPoint: GridPoint | null; hoveredPoint: GridPoint | null },
): void {
  for (const line of lines) {
    const startX = line.gridX1 * viewport.gridSize * viewport.zoom + viewport.offsetX;
    const startY = line.gridY1 * viewport.gridSize * viewport.zoom + viewport.offsetY;
    const endX = line.gridX2 * viewport.gridSize * viewport.zoom + viewport.offsetX;
    const endY = line.gridY2 * viewport.gridSize * viewport.zoom + viewport.offsetY;
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.setLineDash(line.lineStyle === 'dashed' ? [5, 5] : []);
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.setLineDash([]);
    drawEndpoint(ctx, startX, startY, line.startEndpointStyle ?? 'dot', endX, endY);
    drawEndpoint(ctx, endX, endY, line.endEndpointStyle ?? 'dot', startX, startY);
  }
  if (insertion.enabled) renderInsertionIndicators(ctx, viewport, insertion.firstPoint, insertion.hoveredPoint);
}

export function drawEndpoint(ctx: CanvasRenderingContext2D, x: number, y: number, style: 'dot' | 'arrow' | 'none', otherX?: number, otherY?: number): void {
  ctx.fillStyle = '#333333';
  if (style === 'none') return;
  if (style === 'dot') {
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (otherX === undefined || otherY === undefined) return;
  const angle = Math.atan2(y - otherY, x - otherX);
  const arrowSize = 12;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const tipX = x + directionX * arrowSize;
  const tipY = y + directionY * arrowSize;
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(x + perpendicularX * (arrowSize / 2), y + perpendicularY * (arrowSize / 2));
  ctx.lineTo(x - perpendicularX * (arrowSize / 2), y - perpendicularY * (arrowSize / 2));
  ctx.closePath();
  ctx.fill();
}

function renderInsertionIndicators(
  ctx: CanvasRenderingContext2D,
  viewport: LineRendererViewport,
  firstPoint: GridPoint | null,
  hoveredPoint: GridPoint | null,
): void {
  const { gridSize, zoom, offsetX, offsetY } = viewport;
  const startX = Math.floor(-offsetX / (gridSize * zoom)) * gridSize;
  const endX = startX + Math.ceil(viewport.canvasWidth / zoom + gridSize);
  const startY = Math.floor(-offsetY / (gridSize * zoom)) * gridSize;
  const endY = startY + Math.ceil(viewport.canvasHeight / zoom + gridSize);
  const previewColor = 'rgba(100, 150, 255, 0.6)';

  for (let x = startX; x < endX; x += gridSize) {
    for (let y = startY; y < endY; y += gridSize) {
      const highlighted = hoveredPoint?.gridX === x / gridSize && hoveredPoint.gridY === y / gridSize;
      ctx.fillStyle = highlighted ? previewColor : 'rgba(150, 150, 150, 0.3)';
      ctx.beginPath(); ctx.arc(x * zoom + offsetX, y * zoom + offsetY, highlighted ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (!firstPoint || !hoveredPoint) return;
  ctx.strokeStyle = previewColor; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(firstPoint.gridX * gridSize * zoom + offsetX, firstPoint.gridY * gridSize * zoom + offsetY);
  ctx.lineTo(hoveredPoint.gridX * gridSize * zoom + offsetX, hoveredPoint.gridY * gridSize * zoom + offsetY);
  ctx.stroke(); ctx.setLineDash([]);
}
