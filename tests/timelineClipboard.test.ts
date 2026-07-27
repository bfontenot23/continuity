import assert from 'node:assert/strict';
import test from 'node:test';
import { AppStateManager } from '../src/state';
import type { Branch, Continuity, Project } from '../src/types';

const noElements = { textboxes: [], lines: [] };

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    get length() { return storage.size; },
    clear() { storage.clear(); },
    getItem(key: string) { return storage.get(key) ?? null; },
    key(index: number) { return [...storage.keys()][index] ?? null; },
    removeItem(key: string) { storage.delete(key); },
    setItem(key: string, value: string) { storage.set(key, value); },
  },
});

function fixture(): Project {
  const branch: Branch = {
    id: 'branch-ab',
    startContinuityId: 'timeline-a',
    startChapterId: 'chapter-a',
    startPosition: 2,
    endContinuityId: 'timeline-b',
    endChapterId: 'chapter-b',
    endPosition: 1,
  };
  const timeline = (id: string, chapterId: string, branchValue: Branch): Continuity => ({
    id,
    name: id,
    x: id === 'timeline-a' ? 0 : 300,
    y: 0,
    arcs: [{ id: `arc-${id}`, name: 'Arc', order: 0, color: '#000000' }],
    chapters: [{ id: chapterId, title: chapterId, timestamp: 1, arcId: `arc-${id}` }],
    branches: [branchValue],
  });
  return {
    id: 'project',
    title: 'Project',
    created: 1,
    modified: 1,
    continuities: [
      timeline('timeline-a', 'chapter-a', branch),
      timeline('timeline-b', 'chapter-b', branch),
    ],
    textboxes: [],
    lines: [],
  };
}

test('copying one timeline excludes its cross-timeline branch', () => {
  const manager = new AppStateManager();
  manager.setProject(fixture());
  assert.equal(manager.copyTimelinesToClipboard(['timeline-a'], noElements), true);
  const pastedIds = manager.pasteTimelinesFromClipboard().timelineIds;
  assert.equal(pastedIds.length, 1);
  const pasted = manager.getState().currentProject!.continuities.find(item => item.id === pastedIds[0])!;
  assert.deepEqual(pasted.branches, []);
});

test('copying both branch endpoints remaps the full branch graph', () => {
  const manager = new AppStateManager();
  manager.setProject(fixture());
  assert.equal(manager.copyTimelinesToClipboard(['timeline-a', 'timeline-b'], noElements), true);
  const pastedIds = manager.pasteTimelinesFromClipboard().timelineIds;
  assert.equal(pastedIds.length, 2);
  const pasted = manager.getState().currentProject!.continuities.filter(item => pastedIds.includes(item.id));
  const branches = new Map(pasted.flatMap(item => item.branches).map(branch => [branch.id, branch]));
  assert.equal(branches.size, 1);
  const branch = [...branches.values()][0];
  assert.ok(pastedIds.includes(branch.startContinuityId));
  assert.ok(pastedIds.includes(branch.endContinuityId));
  assert.notEqual(branch.startChapterId, 'chapter-a');
  assert.notEqual(branch.endChapterId, 'chapter-b');
});

test('cutting timelines is one recoverable clipboard operation', () => {
  const manager = new AppStateManager();
  manager.setProject(fixture());
  assert.equal(manager.copyTimelinesToClipboard(['timeline-a', 'timeline-b'], noElements, true), true);
  assert.equal(manager.getState().currentProject!.continuities.length, 0);
  assert.equal(manager.pasteTimelinesFromClipboard().timelineIds.length, 2);
});

test('timeline clipboard keeps selected floating elements in the same paste', () => {
  const manager = new AppStateManager();
  manager.setProject(fixture());
  assert.equal(manager.copyTimelinesToClipboard(['timeline-a'], {
    textboxes: [{ id: 'textbox', content: 'Text', x: 10, y: 20, width: 100, height: 50, fontSize: 14 }],
    lines: [{ id: 'line', gridX1: 0, gridY1: 0, gridX2: 2, gridY2: 2 }],
  }), true);
  const pasted = manager.pasteTimelinesFromClipboard();
  assert.equal(pasted.timelineIds.length, 1);
  assert.equal(pasted.textboxIds.length, 1);
  assert.equal(pasted.lineIds.length, 1);
});
