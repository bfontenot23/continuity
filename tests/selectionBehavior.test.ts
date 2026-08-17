import assert from 'node:assert/strict';
import test from 'node:test';
import { groupTimelineChaptersByArc } from '../src/canvasArcGroups';
import {
  advanceSelectionCycle,
  getAssociatedTimelineIds,
  getChapterClipboardEligibility,
  getContiguousSelectedChapterIds,
  getMarqueeSelectionMode,
  getSelectionDragDelta,
  isInsertionBoundaryOccupied,
  SelectionTarget,
  shouldDragChapterSelectionAsTimelines,
} from '../src/selectionBehavior';

test('overlap cycling visits every concrete object across and within types', () => {
  const targets: SelectionTarget[] = [
    { kind: 'branch', id: 'branch-a' },
    { kind: 'branch', id: 'branch-b' },
    { kind: 'line', id: 'line-a' },
  ];
  let state = null;
  const visited: string[] = [];
  for (let index = 0; index < 4; index++) {
    const result = advanceSelectionCycle(targets, 100, 200, state);
    visited.push(result.target!.id);
    state = result.state;
  }
  assert.deepEqual(visited, ['branch-a', 'branch-b', 'line-a', 'branch-a']);
});

test('overlap cycling resets when the stack or point changes', () => {
  const targets: SelectionTarget[] = [{ kind: 'textbox', id: 'one' }, { kind: 'textbox', id: 'two' }];
  const first = advanceSelectionCycle(targets, 10, 10, null);
  const second = advanceSelectionCycle(targets, 30, 10, first.state);
  const changedStack = advanceSelectionCycle(targets.slice(1), 30, 10, second.state);
  assert.equal(first.target?.id, 'one');
  assert.equal(second.target?.id, 'one');
  assert.equal(changedStack.target?.id, 'two');
});

test('dragging a non-adjacent chapter selection keeps only the clicked contiguous run', () => {
  const chapters = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, title: id.toUpperCase() }));
  const selected = new Set(['a', 'b', 'd', 'e']);
  assert.deepEqual(getContiguousSelectedChapterIds(chapters, selected, 'a'), ['a', 'b']);
  assert.deepEqual(getContiguousSelectedChapterIds(chapters, selected, 'd'), ['d', 'e']);
});

test('associated timelines include explicit timelines, chapter owners, and both branch endpoints', () => {
  const timelines = [
    { id: 'timeline-a', chapters: [{ id: 'chapter-a', title: 'A' }] },
    { id: 'timeline-b', chapters: [{ id: 'chapter-b', title: 'B' }] },
    { id: 'timeline-c', chapters: [] },
  ];
  const branches = [{ id: 'branch-ab', startContinuityId: 'timeline-a', endContinuityId: 'timeline-b' }];
  const result = getAssociatedTimelineIds(
    timelines,
    branches,
    new Set(['timeline-c']),
    new Set(['chapter-a']),
    new Set(['branch-ab']),
  );
  assert.deepEqual([...result].sort(), ['timeline-a', 'timeline-b', 'timeline-c']);
});

test('chapter drags become timeline-group drags for every non-local selection shape', () => {
  const base = {
    chapterWasSelected: true,
    hasModifier: false,
    selectedTimelineCount: 0,
    selectedChapterTimelineCount: 1,
    selectedFloatingElementCount: 0,
  };
  assert.equal(shouldDragChapterSelectionAsTimelines(base), false, 'local chapters and branches reorder locally');
  assert.equal(shouldDragChapterSelectionAsTimelines({ ...base, selectedTimelineCount: 1 }), true);
  assert.equal(shouldDragChapterSelectionAsTimelines({ ...base, selectedChapterTimelineCount: 2 }), true);
  assert.equal(shouldDragChapterSelectionAsTimelines({ ...base, selectedFloatingElementCount: 1 }), true);
  assert.equal(shouldDragChapterSelectionAsTimelines({ ...base, chapterWasSelected: false, selectedTimelineCount: 1 }), false);
  assert.equal(shouldDragChapterSelectionAsTimelines({ ...base, hasModifier: true, selectedTimelineCount: 1 }), false);
});

test('invalid or branch-only clipboard attempts are rejected before replacing a valid payload', () => {
  assert.equal(getChapterClipboardEligibility(2, 2, 0), 'cross-timeline');
  assert.equal(getChapterClipboardEligibility(0, 0, 0), 'empty');
  assert.equal(getChapterClipboardEligibility(1, 3, 0), 'valid');
  assert.equal(getChapterClipboardEligibility(0, 0, 2), 'valid');
});

test('marquee mode is decided by modifiers at drop time', () => {
  assert.equal(getMarqueeSelectionMode(true, false), 'add');
  assert.equal(getMarqueeSelectionMode(false, false), 'replace', 'releasing Shift before drop replaces');
  assert.equal(getMarqueeSelectionMode(true, true), 'remove', 'Ctrl/Cmd removal takes priority');
});

test('all insertion boundaries occupied by a dragged chapter block are hidden', () => {
  const chapters = ['head', 'a', 'b', 'c', 'tail'].map(id => ({
    id,
    title: id === 'head' ? 'Head' : id === 'tail' ? 'Tail' : id.toUpperCase(),
  }));
  const dragged = new Set(['a', 'b']);
  assert.equal(isInsertionBoundaryOccupied(chapters, dragged, 0), true, 'before the group');
  assert.equal(isInsertionBoundaryOccupied(chapters, dragged, 1), true, 'inside the group');
  assert.equal(isInsertionBoundaryOccupied(chapters, dragged, 2), true, 'after the group');
  assert.equal(isInsertionBoundaryOccupied(chapters, dragged, 3), false);
});

test('mixed drag members share one snapped displacement', () => {
  assert.deepEqual(getSelectionDragDelta(26, -24, 50, true), {
    worldX: 50, worldY: 0, gridX: 1, gridY: 0,
  });
  assert.deepEqual(getSelectionDragDelta(26, -24, 50, false), {
    worldX: 26, worldY: -24, gridX: 1, gridY: 0,
  });
  assert.equal(getSelectionDragDelta(-25, 0, 50, true).gridX, -1, 'half-grid snapping is symmetric');
});

test('non-continuous arc runs remain separate selectable title groups', () => {
  const groups = groupTimelineChaptersByArc([
    { id: 'head', title: 'Head', x: 0, width: 1 },
    { id: 'a1', title: 'A1', x: 1, width: 1, arcId: 'arc-a' },
    { id: 'b1', title: 'B1', x: 2, width: 1, arcId: 'arc-b' },
    { id: 'a2', title: 'A2', x: 3, width: 1, arcId: 'arc-a' },
    { id: 'tail', title: 'Tail', x: 4, width: 1 },
  ]);
  const arcARuns = groups.filter(group => group.arcId === 'arc-a');
  assert.equal(arcARuns.length, 2);
  assert.deepEqual(arcARuns.map(group => group.chapters.map(chapter => chapter.id)), [['a1'], ['a2']]);
});
