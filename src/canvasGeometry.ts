export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export function distanceToLineSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const projection = lengthSquared === 0
    ? -1
    : ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const nearestX = startX + clampedProjection * deltaX;
  const nearestY = startY + clampedProjection * deltaY;
  return Math.hypot(pointX - nearestX, pointY - nearestY);
}

export function getResizeCursor(handle: ResizeHandle): string {
  if (handle === 'n' || handle === 's') return 'ns-resize';
  if (handle === 'e' || handle === 'w') return 'ew-resize';
  if (handle === 'nw' || handle === 'se') return 'nwse-resize';
  return 'nesw-resize';
}

export function getRotatedResize(
  original: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  worldDeltaX: number,
  worldDeltaY: number,
  rotationDegrees: number,
  lockAspectRatio: boolean,
): { x: number; y: number; width: number; height: number } {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const localDeltaX = worldDeltaX * cos + worldDeltaY * sin;
  const localDeltaY = -worldDeltaX * sin + worldDeltaY * cos;
  const horizontalChange = handle.includes('e') ? localDeltaX : handle.includes('w') ? -localDeltaX : 0;
  const verticalChange = handle.includes('s') ? localDeltaY : handle.includes('n') ? -localDeltaY : 0;
  let width = Math.max(50, original.width + horizontalChange);
  let height = Math.max(30, original.height + verticalChange);
  if (lockAspectRatio) {
    const ratio = original.width / original.height;
    const useHorizontal = !handle.match(/[ns]/)
      || Boolean(handle.match(/[ew]/) && Math.abs(horizontalChange / ratio) >= Math.abs(verticalChange));
    width = useHorizontal
      ? Math.max(50, original.width + horizontalChange)
      : Math.max(50, (original.height + verticalChange) * ratio);
    height = Math.max(30, width / ratio);
  }

  const widthDelta = width - original.width;
  const heightDelta = height - original.height;
  const localCenterShiftX = handle.includes('e') ? widthDelta / 2 : handle.includes('w') ? -widthDelta / 2 : 0;
  const localCenterShiftY = handle.includes('s') ? heightDelta / 2 : handle.includes('n') ? -heightDelta / 2 : 0;
  const centerX = original.x + original.width / 2 + localCenterShiftX * cos - localCenterShiftY * sin;
  const centerY = original.y + original.height / 2 + localCenterShiftX * sin + localCenterShiftY * cos;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}
