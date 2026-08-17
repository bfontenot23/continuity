import type { TimelineChapter } from './canvas';

export interface ArcChapterGroup {
  arcId: string;
  chapters: TimelineChapter[];
}

/** Group contiguous timeline chapters by arc, keeping unassigned chapters separate. */
export function groupTimelineChaptersByArc(chapters?: TimelineChapter[]): ArcChapterGroup[] {
  const groups: ArcChapterGroup[] = [];
  let currentArcId: string | null = null;
  let currentGroup: TimelineChapter[] = [];

  for (const chapter of chapters ?? []) {
    if (chapter.title === 'Head' || chapter.title === 'Tail') continue;
    const arcId = chapter.arcId ?? `unassigned-${chapter.id}`;
    if (arcId !== currentArcId) {
      if (currentArcId && currentGroup.length > 0) groups.push({ arcId: currentArcId, chapters: currentGroup });
      currentArcId = arcId;
      currentGroup = [chapter];
    } else {
      currentGroup.push(chapter);
    }
  }

  if (currentArcId && currentGroup.length > 0) groups.push({ arcId: currentArcId, chapters: currentGroup });
  return groups;
}
