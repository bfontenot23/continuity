import assert from 'node:assert/strict';
import test from 'node:test';
import { hasLegacyBranchAnchors } from '../src/branchBehavior';
import { parseRgbaColor, rgbaToCss, rgbaToHex, normalizeRotation } from '../src/shapeStyle';
import { findChapterToLeft, findChapterToRight } from '../src/timelineLayout';
import { AppStateManager } from '../src/state';
import { createProject, createShape, type Continuity } from '../src/types';
import { getRotatedResize } from '../src/canvasGeometry';

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

test('head-side branch anchors resolve to the first chapter with extended heads', () => {
  const chapters = [
    { id: 'first', title: 'First', timestamp: 1, gridLength: 1 },
    { id: 'second', title: 'Second', timestamp: 2, gridLength: 1 },
  ];
  assert.equal(findChapterToLeft(chapters, 0, 3), 'first');
  assert.equal(findChapterToLeft(chapters, 3, 3), 'first');
  assert.equal(findChapterToRight(chapters, 0, 3), 'first');
  assert.equal(findChapterToRight(chapters, 3, 3), 'first');
});

test('empty endpoint timelines are valid and do not mark a branch as legacy', () => {
  const populated: Continuity = {
    id: 'populated', name: 'Populated', arcs: [], branches: [],
    chapters: [{ id: 'chapter', title: 'Chapter', timestamp: 1 }],
  };
  const empty: Continuity = { id: 'empty', name: 'Empty', arcs: [], branches: [], chapters: [] };
  const valid = {
    startContinuityId: 'populated', startChapterId: 'chapter',
    endContinuityId: 'empty', endChapterId: undefined,
  };
  assert.equal(hasLegacyBranchAnchors(valid, [populated, empty]), false);
  assert.equal(hasLegacyBranchAnchors({ ...valid, startChapterId: undefined }, [populated, empty]), true);
});

test('new shapes have centered clipped-text defaults and configurable RGBA style data', () => {
  const shape = createShape(10, 20, 'triangle');
  assert.equal(shape.alignX, 'center');
  assert.equal(shape.alignY, 'middle');
  assert.equal(shape.shapeFillColor, 'rgba(102, 126, 234, 0.15)');
  assert.equal(shape.shapeOutlineColor, 'rgba(102, 126, 234, 1)');
  assert.equal(shape.shapeOutlineWidth, 2);
  assert.equal(shape.rotation, 0);

  const rgba = parseRgbaColor('rgba(12, 34, 56, 0.42)', { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(rgba, { r: 12, g: 34, b: 56, a: 0.42 });
  assert.equal(rgbaToHex(rgba), '#0c2238');
  assert.equal(rgbaToCss(rgba), 'rgba(12, 34, 56, 0.42)');
  assert.equal(normalizeRotation(-45), 315);
  assert.equal(normalizeRotation(405), 45);
});

test('rotated shape resizing follows the rotated local axes', () => {
  const resized = getRotatedResize({ x: 0, y: 0, width: 100, height: 100 }, 'e', 0, 50, 90, false);
  assert.ok(Math.abs(resized.width - 150) < 0.001);
  assert.ok(Math.abs(resized.height - 100) < 0.001);
  assert.ok(Math.abs(resized.x + 25) < 0.001);
  assert.ok(Math.abs(resized.y - 25) < 0.001);
});

test('undo history retains the latest 100 project actions', () => {
  const manager = new AppStateManager();
  manager.setProject(createProject('Initial'));
  for (let index = 1; index <= 101; index++) manager.updateProject({ title: `Edit ${index}` });

  let undoCount = 0;
  while (manager.canUndo()) { manager.undo(); undoCount++; }
  assert.equal(undoCount, 100);
  assert.equal(manager.getState().currentProject?.title, 'Edit 1', 'the single oldest state was evicted');
});
