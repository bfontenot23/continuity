import assert from 'node:assert/strict';
import test from 'node:test';
import { AppStateManager } from '../src/state';
import type { Branch, Continuity, Project } from '../src/types';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() { return storage.size; },
    clear() { storage.clear(); },
    getItem(key: string) { return storage.get(key) ?? null; },
    key(index: number) { return [...storage.keys()][index] ?? null; },
    removeItem(key: string) { storage.delete(key); },
    setItem(key: string, value: string) { storage.set(key, value); },
  },
});

function chapter(id: string, timestamp: number) {
  return { id, title: id.toUpperCase(), timestamp, gridLength: 1 };
}

function timeline(id: string, chapters: ReturnType<typeof chapter>[], branches: Branch[] = []): Continuity {
  return { id, name: id, x: id === 'timeline-a' ? 0 : 400, y: 0, arcs: [], chapters, branches };
}

function projectFixture(): Project {
  const branch: Branch = {
    id: 'branch-ab',
    startContinuityId: 'timeline-a',
    startChapterId: 'a2',
    startPosition: 3,
    endContinuityId: 'timeline-b',
    endChapterId: 'b1',
    endPosition: 1,
  };
  return {
    id: 'project',
    title: 'Project',
    created: 1,
    modified: 1,
    continuities: [
      timeline('timeline-a', [chapter('a1', 1), chapter('a2', 2), chapter('a3', 3)], [branch]),
      timeline('timeline-b', [chapter('b1', 1), chapter('b2', 2)], [branch]),
    ],
    textboxes: [
      { id: 'textbox', content: 'Text', x: 10, y: 20, width: 100, height: 50, fontSize: 14 },
      { id: 'shape', content: 'Shape', x: 30, y: 40, width: 80, height: 80, fontSize: 14, shapeType: 'circle' },
      { id: 'image', content: '', x: 50, y: 60, width: 120, height: 90, fontSize: 14, imageDataUrl: 'data:image/png;base64,AA==' },
    ],
    lines: [
      { id: 'line-a', gridX1: 0, gridY1: 0, gridX2: 2, gridY2: 2 },
      { id: 'line-b', gridX1: 3, gridY1: 1, gridX2: 5, gridY2: 1 },
    ],
  };
}

test('mixed deletion removes exactly the selected objects and is one undo step', () => {
  const manager = new AppStateManager();
  manager.setProject(projectFixture());
  manager.deleteCanvasSelection({
    timelineIds: [],
    chapterIds: ['a2'],
    branchIds: ['branch-ab'],
    textboxIds: ['shape', 'image'],
    lineIds: ['line-b'],
  });

  const changed = manager.getState().currentProject!;
  assert.deepEqual(changed.continuities[0].chapters.map(item => item.id), ['a1', 'a3']);
  assert.equal(new Set(changed.continuities.flatMap(item => item.branches).map(item => item.id)).has('branch-ab'), false);
  assert.deepEqual(changed.textboxes!.map(item => item.id), ['textbox']);
  assert.deepEqual(changed.lines!.map(item => item.id), ['line-a']);

  manager.undo();
  const restored = manager.getState().currentProject!;
  assert.deepEqual(restored.continuities[0].chapters.map(item => item.id), ['a1', 'a2', 'a3']);
  assert.deepEqual(restored.textboxes!.map(item => item.id), ['textbox', 'shape', 'image']);
  assert.deepEqual(restored.lines!.map(item => item.id), ['line-a', 'line-b']);
  assert.equal(manager.canUndo(), false, 'the mixed operation consumed only one history entry');
});

test('deleting chapters on both endpoints does not implicitly delete their unselected branch', () => {
  const manager = new AppStateManager();
  manager.setProject(projectFixture());
  manager.deleteCanvasSelection({
    timelineIds: [],
    chapterIds: ['a2', 'b1'],
    branchIds: [],
    textboxIds: [],
    lineIds: [],
  });
  const branches = new Map(manager.getState().currentProject!.continuities
    .flatMap(item => item.branches)
    .map(item => [item.id, item]));
  assert.equal(branches.has('branch-ab'), true);
});

test('batch chapter deletion retargets branches only to surviving neighbors regardless of id order', () => {
  const startBranch: Branch = {
    id: 'branch-start', startContinuityId: 'timeline-a', startChapterId: 'c', startPosition: 4,
    endContinuityId: 'timeline-b', endChapterId: 'x', endPosition: 1,
  };
  const endBranch: Branch = {
    id: 'branch-end', startContinuityId: 'timeline-b', startChapterId: 'x', startPosition: 2,
    endContinuityId: 'timeline-a', endChapterId: 'b', endPosition: 2,
  };
  const project = projectFixture();
  project.continuities = [
    timeline('timeline-a', [chapter('a', 1), chapter('b', 2), chapter('c', 3), chapter('d', 4)], [startBranch, endBranch]),
    timeline('timeline-b', [chapter('x', 1)], [startBranch, endBranch]),
  ];
  const manager = new AppStateManager();
  manager.setProject(project);
  manager.deleteCanvasSelection({ timelineIds: [], chapterIds: ['c', 'b'], branchIds: [], textboxIds: [], lineIds: [] });

  const branches = new Map(manager.getState().currentProject!.continuities
    .flatMap(item => item.branches)
    .map(item => [item.id, item]));
  assert.equal(branches.get('branch-start')?.startChapterId, 'a');
  assert.equal(branches.get('branch-end')?.endChapterId, 'd');
  assert.equal([...branches.values()].some(branch => branch.startChapterId === 'b' || branch.startChapterId === 'c'), false);
  assert.equal([...branches.values()].some(branch => branch.endChapterId === 'b' || branch.endChapterId === 'c'), false);
});

test('a mixed movement of floating objects, lines, and timelines is one undo step', () => {
  const manager = new AppStateManager();
  manager.setProject(projectFixture());
  manager.moveCanvasSelection(
    [{ id: 'textbox', x: 110, y: 120 }, { id: 'image', x: 150, y: 160 }],
    [{ id: 'line-a', gridX1: 2, gridY1: 2, gridX2: 4, gridY2: 4 }],
    [{ id: 'timeline-a', x: 200, y: 100 }, { id: 'timeline-b', x: 600, y: 100 }],
  );
  const changed = manager.getState().currentProject!;
  assert.equal(changed.textboxes!.find(item => item.id === 'textbox')?.x, 110);
  assert.equal(changed.lines!.find(item => item.id === 'line-a')?.gridX1, 2);
  assert.deepEqual(changed.continuities.map(item => [item.x, item.y]), [[200, 100], [600, 100]]);

  manager.undo();
  const restored = manager.getState().currentProject!;
  assert.equal(restored.textboxes!.find(item => item.id === 'textbox')?.x, 10);
  assert.equal(restored.lines!.find(item => item.id === 'line-a')?.gridX1, 0);
  assert.deepEqual(restored.continuities.map(item => [item.x, item.y]), [[0, 0], [400, 0]]);
  assert.equal(manager.canUndo(), false);
});

test('adjacent chapter groups reorder as a stable block and undo together', () => {
  const manager = new AppStateManager();
  const project = projectFixture();
  project.continuities[0].chapters = ['a', 'b', 'c', 'd', 'e'].map((id, index) => chapter(id, index + 1));
  manager.setProject(project);
  manager.reorderChapters('timeline-a', ['b', 'c'], 5);
  assert.deepEqual(manager.getState().currentProject!.continuities[0].chapters
    .slice().sort((a, b) => a.timestamp - b.timestamp).map(item => item.id), ['a', 'd', 'e', 'b', 'c']);
  manager.undo();
  assert.deepEqual(manager.getState().currentProject!.continuities[0].chapters
    .slice().sort((a, b) => a.timestamp - b.timestamp).map(item => item.id), ['a', 'b', 'c', 'd', 'e']);
});

test('pasted chapter groups never retain dangling source arc ids', () => {
  const manager = new AppStateManager();
  const project = projectFixture();
  project.continuities[1].arcs = [{ id: 'target-arc', name: 'Target', order: 0, color: '#123456' }];
  manager.setProject(project);
  manager.insertChapters('timeline-b', [
    { id: 'copy-a', title: 'Copy A', timestamp: 1, arcId: 'source-arc' },
    { id: 'copy-b', title: 'Copy B', timestamp: 2 },
  ], 1);
  const inserted = manager.getState().currentProject!.continuities[1].chapters
    .filter(item => item.id.startsWith('copy-'));
  assert.deepEqual(inserted.map(item => item.arcId), ['target-arc', undefined]);

  const emptyArcTimeline = manager.getState().currentProject!.continuities[0];
  manager.insertChapters(emptyArcTimeline.id, [{ id: 'copy-c', title: 'Copy C', timestamp: 1, arcId: 'source-arc' }], 0);
  assert.equal(emptyArcTimeline.chapters.find(item => item.id === 'copy-c')?.arcId, undefined);
});

test('timeline deletion can include floating elements without deleting unrelated selected content', () => {
  const manager = new AppStateManager();
  manager.setProject(projectFixture());
  manager.deleteCanvasSelection({
    timelineIds: ['timeline-a'],
    chapterIds: [],
    branchIds: [],
    textboxIds: ['textbox'],
    lineIds: ['line-a'],
  });
  const changed = manager.getState().currentProject!;
  assert.deepEqual(changed.continuities.map(item => item.id), ['timeline-b']);
  assert.deepEqual(changed.continuities[0].chapters.map(item => item.id), ['b1', 'b2']);
  assert.deepEqual(changed.textboxes!.map(item => item.id), ['shape', 'image']);
  assert.deepEqual(changed.lines!.map(item => item.id), ['line-b']);
  assert.equal(changed.continuities[0].branches.length, 0, 'branches connected to a deleted timeline are removed');
});
