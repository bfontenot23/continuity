/**
 * Shared, model-level timeline layout calculations.
 *
 * Canvas rendering and state updates must agree on these values so branch
 * anchors continue to point at the same chapter after a layout change.
 */
import { Chapter } from './types';

export interface ChapterPosition {
  x: number;
  width: number;
}

export const TIMELINE_HEAD_WIDTH = 1;
export const CHAPTER_TITLE_CHARACTERS_PER_GRID_UNIT = 5;

export function sortChapters(chapters: readonly Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.timestamp - b.timestamp);
}

export function getChapterWidth(chapter: Chapter): number {
  return chapter.gridLength && chapter.gridLength > 0
    ? chapter.gridLength
    : Math.max(1, Math.ceil(chapter.title.length / CHAPTER_TITLE_CHARACTERS_PER_GRID_UNIT));
}

export function getChapterPositions(chapters: readonly Chapter[]): Map<string, ChapterPosition> {
  const positions = new Map<string, ChapterPosition>();
  let x = TIMELINE_HEAD_WIDTH;

  for (const chapter of sortChapters(chapters)) {
    const width = getChapterWidth(chapter);
    positions.set(chapter.id, { x, width });
    x += width;
  }

  return positions;
}

export function findChapterToLeft(chapters: readonly Chapter[], gridPosition: number): string | undefined {
  const sortedChapters = sortChapters(chapters);
  if (sortedChapters.length === 0) return undefined;

  const positions = getChapterPositions(sortedChapters);
  const firstChapter = sortedChapters[0];
  const lastChapter = sortedChapters[sortedChapters.length - 1];
  const lastPosition = positions.get(lastChapter.id)!;

  for (const chapter of sortedChapters) {
    const position = positions.get(chapter.id)!;
    if (Math.abs(gridPosition - (position.x + position.width)) < 0.01) return chapter.id;
  }

  if (gridPosition < TIMELINE_HEAD_WIDTH) return firstChapter.id;
  if (gridPosition >= lastPosition.x + lastPosition.width) return lastChapter.id;
  return undefined;
}

export function findChapterToRight(chapters: readonly Chapter[], gridPosition: number): string | undefined {
  const sortedChapters = sortChapters(chapters);
  if (sortedChapters.length === 0) return undefined;

  const positions = getChapterPositions(sortedChapters);
  const firstChapter = sortedChapters[0];
  const lastChapter = sortedChapters[sortedChapters.length - 1];
  const lastPosition = positions.get(lastChapter.id)!;

  for (const chapter of sortedChapters) {
    const position = positions.get(chapter.id)!;
    if (Math.abs(gridPosition - position.x) < 0.01) return chapter.id;
  }

  if (gridPosition < TIMELINE_HEAD_WIDTH) return firstChapter.id;
  if (gridPosition >= lastPosition.x + lastPosition.width) return lastChapter.id;
  return undefined;
}
