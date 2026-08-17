export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
export type ObjectControl = ResizeHandle | 'rotate';

export interface ObjectControlPoint {
  control: ObjectControl;
  x: number;
  y: number;
}

/** Screen-space control points for a box rotated around its center. */
export function getObjectControlPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number,
  rotationOffset = 28,
): ObjectControlPoint[] {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radians = rotationDegrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotate = (localX: number, localY: number) => ({
    x: centerX + localX * cos - localY * sin,
    y: centerY + localX * sin + localY * cos,
  });
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const definitions: Array<[ObjectControl, number, number]> = [
    ['nw', -halfWidth, -halfHeight], ['n', 0, -halfHeight], ['ne', halfWidth, -halfHeight],
    ['w', -halfWidth, 0], ['e', halfWidth, 0],
    ['sw', -halfWidth, halfHeight], ['s', 0, halfHeight], ['se', halfWidth, halfHeight],
    ['rotate', -halfWidth - rotationOffset, -halfHeight - rotationOffset],
  ];
  return definitions.map(([control, localX, localY]) => ({ control, ...rotate(localX, localY) }));
}

export function getObjectControlAtPoint(
  points: readonly ObjectControlPoint[],
  pointerX: number,
  pointerY: number,
  hitRadius: number,
): ObjectControl | null {
  return points.find(point => Math.hypot(pointerX - point.x, pointerY - point.y) <= hitRadius)?.control ?? null;
}

export function getPointerRotation(
  centerX: number,
  centerY: number,
  pointerX: number,
  pointerY: number,
  startPointerAngle: number,
  startRotation: number,
  snapDegrees = 0,
): number {
  const pointerAngle = Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI;
  let rotation = ((startRotation + pointerAngle - startPointerAngle) % 360 + 360) % 360;
  if (snapDegrees > 0) rotation = Math.round(rotation / snapDegrees) * snapDegrees % 360;
  return rotation;
}

export const COMMON_ROTATION_ANGLES = [
  0, 30, 45, 60, 90, 120, 135, 150,
  180, 210, 225, 240, 270, 300, 315, 330,
] as const;

/** Magnetize only when close to a familiar angle; otherwise preserve precision. */
export function snapRotationToCommonAngle(rotation: number, enabled: boolean, threshold = 4): number {
  const normalized = ((rotation % 360) + 360) % 360;
  if (!enabled) return normalized;
  let nearest = normalized;
  let nearestDistance = Infinity;
  for (const angle of COMMON_ROTATION_ANGLES) {
    const distance = Math.abs(((normalized - angle + 180) % 360 + 360) % 360 - 180);
    if (distance < nearestDistance) {
      nearest = angle;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= threshold ? nearest : normalized;
}

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
