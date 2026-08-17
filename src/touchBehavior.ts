export const TOUCH_HOLD_DURATION = 450;
export const TOUCH_MOVE_THRESHOLD = 10;

export type TouchPlacementMode = 'timeline' | 'textbox' | 'shape' | 'image';

export function getTouchPlacementHint(input: {
  placementMode: TouchPlacementMode | null;
  chapterInsertion: boolean;
  chapterPaste: boolean;
  branchInsertion: boolean;
  hasBranchStart: boolean;
  lineInsertion: boolean;
  hasLineStart: boolean;
}): string | null {
  if (input.placementMode === 'timeline') return 'Tap an empty grid location to place the timeline.';
  if (input.placementMode === 'textbox') return 'Tap an empty grid location to place the textbox.';
  if (input.placementMode === 'shape') return 'Tap an empty grid location to place the shape.';
  if (input.placementMode === 'image') return 'Tap an empty grid location to place the image.';
  if (input.chapterInsertion) return input.chapterPaste
    ? 'Tap a timeline insertion point or empty grid location to paste the chapters.'
    : 'Tap a timeline insertion point or empty grid location to add a chapter.';
  if (input.branchInsertion) return input.hasBranchStart
    ? 'Tap a point on another timeline to finish the branch.'
    : 'Tap a point on the first timeline to start the branch.';
  if (input.lineInsertion) return input.hasLineStart
    ? 'Tap a second grid point to finish the line.'
    : 'Tap the first grid point to start the line.';
  return null;
}

export interface TouchPoint {
  clientX: number;
  clientY: number;
}

export function touchDistance(first: TouchPoint, second: TouchPoint): number {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function touchCentroid(points: readonly TouchPoint[]): TouchPoint {
  const count = Math.max(1, points.length);
  return {
    clientX: points.reduce((total, point) => total + point.clientX, 0) / count,
    clientY: points.reduce((total, point) => total + point.clientY, 0) / count,
  };
}

export function hasTouchMoved(start: TouchPoint, current: TouchPoint, threshold = TOUCH_MOVE_THRESHOLD): boolean {
  return touchDistance(start, current) > threshold;
}

export function getPinchViewport(input: {
  startCenter: TouchPoint;
  currentCenter: TouchPoint;
  startDistance: number;
  currentDistance: number;
  startOffsetX: number;
  startOffsetY: number;
  startZoom: number;
  minZoom?: number;
  maxZoom?: number;
}): { offsetX: number; offsetY: number; zoom: number } {
  const safeDistance = Math.max(1, input.startDistance);
  const zoom = Math.max(input.minZoom ?? 0.5, Math.min(input.maxZoom ?? 3,
    input.startZoom * input.currentDistance / safeDistance));
  const worldX = (input.startCenter.clientX - input.startOffsetX) / input.startZoom;
  const worldY = (input.startCenter.clientY - input.startOffsetY) / input.startZoom;
  return {
    zoom,
    offsetX: input.currentCenter.clientX - worldX * zoom,
    offsetY: input.currentCenter.clientY - worldY * zoom,
  };
}

export function isMultiTouchDoubleTap(
  previous: { fingers: number; time: number; x: number; y: number } | null,
  current: { fingers: number; time: number; x: number; y: number },
  interval: number,
): boolean {
  return !!previous
    && previous.fingers === current.fingers
    && current.time - previous.time <= interval
    && Math.hypot(current.x - previous.x, current.y - previous.y) <= 40;
}
