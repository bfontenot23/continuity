import assert from 'node:assert/strict';
import test from 'node:test';
import { inferControlScheme, installControlSchemeDetection, shouldAutoFocusEditor, shouldAutoOpenCreationEditor } from '../src/controlScheme';
import {
  getPinchViewport,
  getTouchPlacementHint,
  hasTouchMoved,
  isMultiTouchDoubleTap,
  touchCentroid,
  touchDistance,
} from '../src/touchBehavior';

test('control scheme detection requires touch hardware and touch-like media signals', () => {
  assert.equal(inferControlScheme({ coarsePointer: true, hoverUnavailable: true, maxTouchPoints: 5 }), 'touch');
  assert.equal(inferControlScheme({ coarsePointer: false, hoverUnavailable: false, maxTouchPoints: 5 }), 'pointer');
  assert.equal(inferControlScheme({ coarsePointer: true, hoverUnavailable: true, maxTouchPoints: 0 }), 'pointer');
});

test('hybrid devices switch touch UI on for fingers and back off for a mouse', () => {
  const pointerListeners: Function[] = [];
  const mediaListeners: Function[] = [];
  const documentMock = {
    documentElement: { dataset: {} as Record<string, string> },
    addEventListener(type: string, listener: Function) {
      if (type === 'pointerdown') pointerListeners.push(listener);
    },
    removeEventListener() {},
  };
  const mediaQuery = {
    matches: true,
    addEventListener(_type: string, listener: Function) { mediaListeners.push(listener); },
    removeEventListener() {},
  };
  const windowMock = {
    navigator: { maxTouchPoints: 5 },
    matchMedia: () => mediaQuery,
  };

  installControlSchemeDetection(windowMock as unknown as Window, documentMock as unknown as Document);
  assert.equal(documentMock.documentElement.dataset.controlScheme, 'touch');
  pointerListeners[0]({ pointerType: 'mouse' });
  assert.equal(documentMock.documentElement.dataset.controlScheme, 'pointer');
  pointerListeners[0]({ pointerType: 'touch' });
  assert.equal(documentMock.documentElement.dataset.controlScheme, 'touch');
  assert.equal(mediaListeners.length, 2);
});

test('touch editors wait for an explicit field tap instead of triggering iOS focus zoom', () => {
  assert.equal(shouldAutoFocusEditor(true, 'touch'), false);
  assert.equal(shouldAutoFocusEditor(true, 'pointer'), true);
  assert.equal(shouldAutoFocusEditor(false, 'pointer'), false);
});

test('creation editors stay closed only on phone-sized touch layouts', () => {
  assert.equal(shouldAutoOpenCreationEditor('touch', 390), false);
  assert.equal(shouldAutoOpenCreationEditor('touch', 720), false);
  assert.equal(shouldAutoOpenCreationEditor('touch', 768), true);
  assert.equal(shouldAutoOpenCreationEditor('pointer', 390), true);
  assert.equal(shouldAutoOpenCreationEditor(undefined, 390), true);
});

test('touch movement ignores finger jitter but recognizes an intentional drag', () => {
  const start = { clientX: 100, clientY: 100 };
  assert.equal(hasTouchMoved(start, { clientX: 106, clientY: 106 }), false);
  assert.equal(hasTouchMoved(start, { clientX: 112, clientY: 100 }), true);
});

test('pinch zoom keeps the original world point beneath the moving centroid', () => {
  const viewport = getPinchViewport({
    startCenter: { clientX: 100, clientY: 80 },
    currentCenter: { clientX: 130, clientY: 100 },
    startDistance: 100,
    currentDistance: 200,
    startOffsetX: 20,
    startOffsetY: 10,
    startZoom: 1,
  });
  assert.deepEqual(viewport, { zoom: 2, offsetX: -30, offsetY: -40 });
});

test('touch geometry calculates stable centroids and distances', () => {
  const points = [{ clientX: 10, clientY: 20 }, { clientX: 40, clientY: 60 }];
  assert.equal(touchDistance(points[0], points[1]), 50);
  assert.deepEqual(touchCentroid(points), { clientX: 25, clientY: 40 });
});

test('multi-finger history gestures require matching finger counts, timing, and location', () => {
  const first = { fingers: 2, time: 1000, x: 100, y: 100 };
  assert.equal(isMultiTouchDoubleTap(first, { fingers: 2, time: 1300, x: 120, y: 110 }, 400), true);
  assert.equal(isMultiTouchDoubleTap(first, { fingers: 3, time: 1300, x: 120, y: 110 }, 400), false);
  assert.equal(isMultiTouchDoubleTap(first, { fingers: 2, time: 1500, x: 120, y: 110 }, 400), false);
  assert.equal(isMultiTouchDoubleTap(first, { fingers: 2, time: 1300, x: 200, y: 100 }, 400), false);
});

test('touch placement hints explain every creation workflow and multi-step state', () => {
  const idle = {
    placementMode: null,
    chapterInsertion: false,
    chapterPaste: false,
    branchInsertion: false,
    hasBranchStart: false,
    lineInsertion: false,
    hasLineStart: false,
  } as const;
  assert.equal(getTouchPlacementHint(idle), null);
  assert.match(getTouchPlacementHint({ ...idle, placementMode: 'timeline' })!, /empty grid location.*timeline/i);
  assert.match(getTouchPlacementHint({ ...idle, placementMode: 'textbox' })!, /textbox/i);
  assert.match(getTouchPlacementHint({ ...idle, placementMode: 'shape' })!, /shape/i);
  assert.match(getTouchPlacementHint({ ...idle, placementMode: 'image' })!, /image/i);
  assert.match(getTouchPlacementHint({ ...idle, chapterInsertion: true })!, /add a chapter/i);
  assert.match(getTouchPlacementHint({ ...idle, chapterInsertion: true, chapterPaste: true })!, /paste the chapters/i);
  assert.match(getTouchPlacementHint({ ...idle, branchInsertion: true })!, /first timeline/i);
  assert.match(getTouchPlacementHint({ ...idle, branchInsertion: true, hasBranchStart: true })!, /another timeline/i);
  assert.match(getTouchPlacementHint({ ...idle, lineInsertion: true })!, /first grid point/i);
  assert.match(getTouchPlacementHint({ ...idle, lineInsertion: true, hasLineStart: true })!, /second grid point/i);
});
