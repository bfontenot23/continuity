export type SelectionTargetKind = 'branch' | 'textbox' | 'line' | 'arc' | 'chapter' | 'timeline';

export interface SelectionTarget {
  kind: SelectionTargetKind;
  id: string;
}

export interface SelectionCycleState {
  key: string;
  x: number;
  y: number;
  index: number;
}

export interface SelectionCycleResult<T extends SelectionTarget> {
  target: T | null;
  state: SelectionCycleState | null;
}

export interface SelectionChapter {
  id: string;
  title: string;
}

export interface SelectionTimeline {
  id: string;
  chapters?: readonly SelectionChapter[];
}

export interface SelectionBranch {
  id: string;
  startContinuityId: string;
  endContinuityId: string;
}

/**
 * Advance through every concrete object under a point, not merely its object
 * type. This is what lets a stack containing two branches and a line visit all
 * three objects before wrapping back to the first branch.
 */
export function advanceSelectionCycle<T extends SelectionTarget>(
  candidates: readonly T[],
  x: number,
  y: number,
  previous: SelectionCycleState | null,
  tolerance = 6,
): SelectionCycleResult<T> {
  if (!candidates.length) return { target: null, state: null };
  const key = candidates.map(candidate => `${candidate.kind}:${candidate.id}`).join('|');
  const sameStack = previous?.key === key
    && Math.abs(previous.x - x) < tolerance
    && Math.abs(previous.y - y) < tolerance;
  const index = sameStack ? (previous.index + 1) % candidates.length : 0;
  return {
    target: candidates[index],
    state: { key, x, y, index },
  };
}

export function getSelectedChapterTimelineIds(
  timelines: readonly SelectionTimeline[],
  selectedChapterIds: ReadonlySet<string>,
): Set<string> {
  const ids = new Set<string>();
  for (const timeline of timelines) {
    if ((timeline.chapters ?? []).some(chapter => selectedChapterIds.has(chapter.id))) ids.add(timeline.id);
  }
  return ids;
}

export function getAssociatedTimelineIds(
  timelines: readonly SelectionTimeline[],
  branches: readonly SelectionBranch[],
  selectedTimelineIds: ReadonlySet<string>,
  selectedChapterIds: ReadonlySet<string>,
  selectedBranchIds: ReadonlySet<string>,
): Set<string> {
  const ids = new Set(selectedTimelineIds);
  for (const id of getSelectedChapterTimelineIds(timelines, selectedChapterIds)) ids.add(id);
  for (const branch of branches) {
    if (!selectedBranchIds.has(branch.id)) continue;
    ids.add(branch.startContinuityId);
    ids.add(branch.endContinuityId);
  }
  return ids;
}

export function getContiguousSelectedChapterIds(
  chapters: readonly SelectionChapter[],
  selectedChapterIds: ReadonlySet<string>,
  draggedChapterId: string,
): string[] {
  const selectable = chapters.filter(chapter => chapter.title !== 'Head' && chapter.title !== 'Tail');
  const index = selectable.findIndex(chapter => chapter.id === draggedChapterId);
  if (index < 0) return [draggedChapterId];
  let start = index;
  let end = index;
  while (start > 0 && selectedChapterIds.has(selectable[start - 1].id)) start--;
  while (end < selectable.length - 1 && selectedChapterIds.has(selectable[end + 1].id)) end++;
  return selectable.slice(start, end + 1)
    .filter(chapter => selectedChapterIds.has(chapter.id))
    .map(chapter => chapter.id);
}

export interface ChapterTimelineDragDecision {
  chapterWasSelected: boolean;
  hasModifier: boolean;
  selectedTimelineCount: number;
  selectedChapterTimelineCount: number;
  selectedFloatingElementCount: number;
}

export type ChapterClipboardEligibility = 'valid' | 'cross-timeline' | 'empty';
export type MarqueeSelectionMode = 'add' | 'remove' | 'replace';

export function getMarqueeSelectionMode(shiftKey: boolean, platformRemovalModifier: boolean): MarqueeSelectionMode {
  if (platformRemovalModifier) return 'remove';
  return shiftKey ? 'add' : 'replace';
}

export function getChapterClipboardEligibility(
  selectedChapterTimelineCount: number,
  selectedChapterCount: number,
  selectedFloatingElementCount: number,
): ChapterClipboardEligibility {
  if (selectedChapterTimelineCount > 1) return 'cross-timeline';
  if (selectedChapterCount + selectedFloatingElementCount === 0) return 'empty';
  return 'valid';
}

/** A selected chapter moves associated timelines whenever the selection is not a local chapter/branch-only group. */
export function shouldDragChapterSelectionAsTimelines(decision: ChapterTimelineDragDecision): boolean {
  return decision.chapterWasSelected
    && !decision.hasModifier
    && (decision.selectedTimelineCount > 0
      || decision.selectedChapterTimelineCount > 1
      || decision.selectedFloatingElementCount > 0);
}

/** Boundaries touching any chapter in the dragged contiguous block are occupied. */
export function isInsertionBoundaryOccupied(
  chapters: readonly SelectionChapter[],
  draggedChapterIds: ReadonlySet<string>,
  boundaryAfterIndex: number,
): boolean {
  return chapters.some((chapter, index) =>
    draggedChapterIds.has(chapter.id)
    && (boundaryAfterIndex === index || boundaryAfterIndex === index - 1));
}

export interface SelectionDragDelta {
  worldX: number;
  worldY: number;
  gridX: number;
  gridY: number;
}

export function getSelectionDragDelta(
  worldX: number,
  worldY: number,
  gridSize: number,
  snapWorldDelta: boolean,
): SelectionDragDelta {
  const toGrid = (value: number) => Math.sign(value) * Math.round(Math.abs(value) / gridSize) || 0;
  const gridX = toGrid(worldX);
  const gridY = toGrid(worldY);
  return {
    worldX: snapWorldDelta ? gridX * gridSize : worldX,
    worldY: snapWorldDelta ? gridY * gridSize : worldY,
    gridX,
    gridY,
  };
}
