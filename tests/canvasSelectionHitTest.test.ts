import assert from 'node:assert/strict';
import test from 'node:test';
import { TimelineCanvas } from '../src/canvas';

function canvasHarness() {
  const canvas = Object.create(TimelineCanvas.prototype) as any;
  Object.assign(canvas, {
    gridSize: 50,
    timelineHeight: 200,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    ctx: { measureText: (text: string) => ({ width: text.length * 7 }) },
    timelines: [
      {
        id: 'timeline-a', name: 'A', x: 0, y: 0, width: 150, height: 200,
        chapters: [
          { id: 'head-a', title: 'Head', x: 0, width: 1 },
          { id: 'chapter-a', title: 'A', x: 1, width: 1 },
          { id: 'tail-a', title: 'Tail', x: 2, width: 1 },
        ],
      },
      {
        id: 'timeline-b', name: 'B', x: 200, y: 100, width: 150, height: 200,
        chapters: [
          { id: 'head-b', title: 'Head', x: 0, width: 1 },
          { id: 'chapter-b', title: 'B', x: 1, width: 1 },
          { id: 'tail-b', title: 'Tail', x: 2, width: 1 },
        ],
      },
    ],
    branches: [
      { id: 'branch-a', startContinuityId: 'timeline-a', startPosition: 1, endContinuityId: 'timeline-b', endPosition: 0 },
      { id: 'branch-b', startContinuityId: 'timeline-a', startPosition: 1, endContinuityId: 'timeline-b', endPosition: 0 },
    ],
    lines: [{ id: 'line-a', gridX1: 0, gridY1: 1, gridX2: 5, gridY2: 1 }],
    textboxes: [],
    timelineArcs: new Map(),
    selectionCycle: null,
  });
  return canvas;
}

test('canvas hit testing cycles through overlapping branches and lines in branch-first order', () => {
  const canvas = canvasHarness();
  const candidates = canvas.getSelectionTargetsAtPoint(125, 50);
  assert.deepEqual(candidates.map((candidate: any) => [candidate.kind, candidate.id]), [
    ['branch', 'branch-a'],
    ['branch', 'branch-b'],
    ['line', 'line-a'],
  ]);
  assert.equal(canvas.getCycledSelectionTarget(candidates, 125, 50).id, 'branch-a');
  assert.equal(canvas.getCycledSelectionTarget(candidates, 125, 50).id, 'branch-b');
  assert.equal(canvas.getCycledSelectionTarget(candidates, 125, 50).id, 'line-a');
});

test('chapter title hit areas do not accidentally select the underlying timeline', () => {
  const canvas = canvasHarness();
  canvas.branches = [];
  canvas.lines = [];
  const candidates = canvas.getSelectionTargetsAtPoint(75, -12);
  assert.deepEqual(candidates.map((candidate: any) => [candidate.kind, candidate.id]), [
    ['chapter', 'chapter-a'],
  ]);
});

test('line endpoint editing follows the cycled line rather than the first overlapping line', () => {
  const canvas = canvasHarness();
  canvas.lines.push({ id: 'line-b', gridX1: 0, gridY1: 1, gridX2: 5, gridY2: 1 });
  assert.deepEqual(canvas.getClickedLineEndpoint(0, 50, 'line-b'), { lineId: 'line-b', endpoint: 'start' });
});

test('branch hit testing follows the same zoom-independent control points used for drawing', () => {
  const canvas = canvasHarness();
  canvas.zoom = 2;
  // At t=.25, this point lies on the curve rendered with the capped 100px
  // control-point offset. The former 100 * zoom hit curve misses it.
  const start = { x: 100, y: 0 };
  const end = { x: 400, y: 200 };
  const offset = 100;
  const t = 0.25;
  const mt = 1 - t;
  const x = mt ** 3 * start.x
    + 3 * mt ** 2 * t * (start.x + offset)
    + 3 * mt * t ** 2 * (end.x - offset)
    + t ** 3 * end.x;
  const y = mt ** 3 * start.y
    + 3 * mt ** 2 * t * start.y
    + 3 * mt * t ** 2 * end.y
    + t ** 3 * end.y;
  assert.deepEqual(canvas.getClickedBranchCandidates(x, y), ['branch-a', 'branch-b']);
});

test('overlapping titles for separate runs of the same arc cycle as distinct targets', () => {
  const canvas = canvasHarness();
  canvas.branches = [];
  canvas.lines = [];
  canvas.timelines = [{
    id: 'timeline-a', name: 'A', x: 0, y: 0, width: 250, height: 200,
    chapters: [
      { id: 'head', title: 'Head', x: 0, width: 1 },
      { id: 'a1', title: 'A1', x: 1, width: 1, arcId: 'arc-a' },
      { id: 'b1', title: 'B1', x: 2, width: 1, arcId: 'arc-b' },
      { id: 'a2', title: 'A2', x: 3, width: 1, arcId: 'arc-a' },
      { id: 'tail', title: 'Tail', x: 4, width: 1 },
    ],
  }];
  canvas.timelineArcs = new Map([['timeline-a', [
    { id: 'arc-a', name: 'A very long title whose two runs overlap', order: 0, color: '#000000' },
    { id: 'arc-b', name: 'B', order: 1, color: '#111111' },
  ]]]);
  const targets = canvas.getSelectionTargetsAtPoint(110, -36).filter((target: any) => target.kind === 'arc');
  assert.equal(targets.length, 2);
  assert.deepEqual(targets.map((target: any) => target.chapterIds), [['a1'], ['a2']]);
  assert.notEqual(targets[0].id, targets[1].id);
});

test('selection snapshots survive rebuilds while stale ids are discarded', () => {
  const canvas = canvasHarness();
  canvas.textboxes = [{ id: 'textbox', x: 0, y: 0, width: 10, height: 10 }];
  canvas.render = () => {};
  canvas.setSelectionSnapshot({
    timelineIds: ['timeline-a', 'missing-timeline'],
    chapterIds: ['chapter-b', 'missing-chapter'],
    branchIds: ['branch-a', 'missing-branch'],
    textboxIds: ['textbox', 'missing-textbox'],
    lineIds: ['line-a', 'missing-line'],
  });
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: ['timeline-a'],
    chapterIds: ['chapter-b'],
    branchIds: ['branch-a'],
    textboxIds: ['textbox'],
    lineIds: ['line-a'],
  });
});

test('cross-type cycling reaches floating objects and overlapping chapters', () => {
  const canvas = canvasHarness();
  canvas.branches = [];
  canvas.lines = [];
  canvas.timelines[1].x = 0;
  canvas.timelines[1].y = 0;
  canvas.textboxes = [{ id: 'textbox', content: '', x: 50, y: -20, width: 50, height: 20, fontSize: 14 }];
  const targets = canvas.getSelectionTargetsAtPoint(75, -12);
  assert.deepEqual(targets.map((target: any) => [target.kind, target.id]), [
    ['textbox', 'textbox'],
    ['chapter', 'chapter-a'],
    ['chapter', 'chapter-b'],
  ]);
});

test('rotated shapes use their rotated bounds for pointer hit testing', () => {
  const canvas = canvasHarness();
  canvas.timelines = [];
  canvas.branches = [];
  canvas.lines = [];
  canvas.textboxes = [{
    id: 'shape', content: '', x: 0, y: 0, width: 100, height: 50, fontSize: 14,
    shapeType: 'square', rotation: 90,
  }];
  assert.equal(canvas.getClickedTextboxElement(50, 65)?.textboxId, 'shape');
  assert.equal(canvas.getClickedTextboxElement(5, 5), null);
});

test('standard select-all, timeline clipboard, and delete shortcuts operate on mixed selections', () => {
  const canvas = canvasHarness();
  const canvasListeners = new Map<string, Function>();
  const documentListeners = new Map<string, Function[]>();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener(type: string, listener: Function) {
        documentListeners.set(type, [...(documentListeners.get(type) ?? []), listener]);
      },
      removeEventListener() {},
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {}, setTimeout },
  });
  canvas.canvas = {
    style: {},
    addEventListener(type: string, listener: Function) { canvasListeners.set(type, listener); },
    getBoundingClientRect() { return { left: 0, top: 0 }; },
  };
  canvas.menu = {
    isClickingButton: () => false,
    getClickedOption: () => null,
    isOpen: () => false,
    getHoveredOption: () => null,
  };
  canvas.container = { clientWidth: 1000, clientHeight: 800 };
  canvas.menuCanvas = {};
  canvas.render = () => {};
  canvas.selectedTimelineIds = new Set();
  canvas.selectedChapterIds = new Set();
  canvas.selectedBranchIds = new Set();
  canvas.selectedTextboxIds = new Set();
  canvas.selectedLineIds = new Set();
  canvas.chapterClipboard = [];
  canvas.elementClipboard = { textboxes: [], lines: [] };
  canvas.timelineClipboardReady = false;
  canvas.insertionMode = false;
  canvas.branchInsertionMode = false;
  canvas.lineInsertionMode = false;
  canvas.setupEventListeners();
  const keydown = canvas.selectionKeyHandler;
  const event = (key: string, ctrlKey = false) => ({
    key, ctrlKey, metaKey: false, target: { tagName: 'BODY' }, preventDefault() {},
  });

  keydown(event('a', true));
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: ['timeline-a', 'timeline-b'],
    chapterIds: ['chapter-a', 'chapter-b'],
    branchIds: ['branch-a', 'branch-b'],
    textboxIds: [],
    lineIds: ['line-a'],
  });

  let copied: any = null;
  canvas.onCopyTimelines = (timelineIds: string[], elements: unknown, deletion: unknown, cut: boolean) => {
    copied = { timelineIds, elements, deletion, cut };
    return true;
  };
  keydown(event('c', true));
  assert.deepEqual(copied.timelineIds, ['timeline-a', 'timeline-b']);
  assert.equal(copied.cut, false);
  assert.equal(canvas.timelineClipboardReady, true);

  keydown(event('x', true));
  assert.equal(copied.cut, true);
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: [], chapterIds: [], branchIds: [], textboxIds: [], lineIds: [],
  });

  canvas.onPasteTimelines = () => ({ timelineIds: ['pasted'], textboxIds: ['pasted-textbox'], lineIds: ['pasted-line'] });
  keydown(event('v', true));
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: ['pasted'], chapterIds: [], branchIds: [], textboxIds: ['pasted-textbox'], lineIds: ['pasted-line'],
  });

  let deleted: any = null;
  canvas.onDeleteSelection = (selection: unknown) => { deleted = selection; };
  keydown(event('Delete'));
  assert.deepEqual(deleted, {
    timelineIds: ['pasted'], chapterIds: [], branchIds: [], textboxIds: ['pasted-textbox'], lineIds: ['pasted-line'],
  });
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: [], chapterIds: [], branchIds: [], textboxIds: [], lineIds: [],
  });

  const mouse = (clientX: number, clientY: number, modifiers: Record<string, boolean> = {}) => ({
    button: 0, clientX, clientY, shiftKey: false, ctrlKey: false, metaKey: false, ...modifiers,
  });
  canvasListeners.get('mousedown')!(mouse(-20, -60, { shiftKey: true }));
  canvasListeners.get('mousemove')!(mouse(180, 30, { shiftKey: true }));
  canvasListeners.get('mouseup')!(mouse(180, 30));
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: ['timeline-a'], chapterIds: ['chapter-a'], branchIds: [], textboxIds: [], lineIds: [],
  }, 'releasing Shift before drop replaces the prior selection');

  canvasListeners.get('mousedown')!(mouse(-20, -60, { ctrlKey: true }));
  canvasListeners.get('mousemove')!(mouse(180, 30, { ctrlKey: true }));
  canvasListeners.get('mouseup')!(mouse(180, 30, { ctrlKey: true }));
  assert.deepEqual(canvas.getSelectionSnapshot(), {
    timelineIds: [], chapterIds: [], branchIds: [], textboxIds: [], lineIds: [],
  }, 'Ctrl/Cmd marquee removes fully enclosed objects');
});

test('Escape cancels every placement tool and preserves chapter, branch, and line cancellation', () => {
  const canvas = canvasHarness();
  const canvasListeners = new Map<string, Function>();
  const documentListeners = new Map<string, Function[]>();
  let clickedOption: string | null = null;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener(type: string, listener: Function) {
        documentListeners.set(type, [...(documentListeners.get(type) ?? []), listener]);
      },
      removeEventListener() {},
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {}, setTimeout },
  });
  canvas.canvas = {
    width: 1000,
    height: 800,
    style: {},
    addEventListener(type: string, listener: Function) { canvasListeners.set(type, listener); },
    getBoundingClientRect() { return { left: 0, top: 0 }; },
  };
  canvas.menuCanvas = {};
  canvas.container = { clientWidth: 1000, clientHeight: 800 };
  canvas.menu = {
    isClickingButton: () => false,
    getClickedOption: () => clickedOption,
    isOpen: () => false,
    close() {},
    getHoveredOption: () => null,
  };
  canvas.render = () => {};
  canvas.selectedTimelineIds = new Set();
  canvas.selectedChapterIds = new Set();
  canvas.selectedBranchIds = new Set();
  canvas.selectedTextboxIds = new Set();
  canvas.selectedLineIds = new Set();
  canvas.chapterClipboard = [];
  canvas.elementClipboard = { textboxes: [], lines: [] };
  canvas.timelineClipboardReady = false;
  canvas.insertionMode = false;
  canvas.branchInsertionMode = false;
  canvas.lineInsertionMode = false;
  canvas.placementMode = null;

  const created: string[] = [];
  canvas.onAddTimeline = (x: number, y: number) => created.push(`timeline:${x},${y}`);
  canvas.onAddTextbox = (x: number, y: number) => created.push(`textbox:${x},${y}`);
  canvas.onAddShape = (x: number, y: number) => created.push(`shape:${x},${y}`);
  canvas.onAddImage = (x: number, y: number) => created.push(`image:${x},${y}`);
  canvas.setupEventListeners();

  const mouse = (clientX: number, clientY: number) => ({
    button: 0, clientX, clientY, shiftKey: false, ctrlKey: false, metaKey: false,
  });
  const escape = () => {
    let prevented = false;
    canvas.escapeKeyHandler({ key: 'Escape', preventDefault() { prevented = true; } });
    return prevented;
  };

  for (const [option, mode] of [
    ['new-timeline', 'timeline'],
    ['new-textbox', 'textbox'],
    ['new-shape', 'shape'],
    ['new-image', 'image'],
  ] as const) {
    clickedOption = option;
    canvasListeners.get('mousedown')!(mouse(900, 700));
    clickedOption = null;
    assert.equal(canvas.placementMode, mode, `${option} enters placement mode`);
    assert.equal(escape(), true, `Escape handles ${mode} placement`);
    assert.equal(canvas.placementMode, null);
    assert.equal(canvas.canvas.style.cursor, 'grab');
  }
  assert.deepEqual(created, [], 'Escape cancels before any object is created');

  canvas.insertionMode = true;
  canvas.chapterPasteMode = true;
  canvas.branchInsertionMode = true;
  canvas.branchFirstPoint = { timelineId: 'timeline-a', position: 1 };
  canvas.lineInsertionMode = true;
  canvas.lineFirstPoint = { gridX: 1, gridY: 1 };
  assert.equal(escape(), true);
  assert.equal(canvas.insertionMode, false);
  assert.equal(canvas.chapterPasteMode, false);
  assert.equal(canvas.branchInsertionMode, false);
  assert.equal(canvas.branchFirstPoint, null);
  assert.equal(canvas.lineInsertionMode, false);
  assert.equal(canvas.lineFirstPoint, null);
});

test('placement tools create once at the clicked location and invalid timeline clicks keep placement active', () => {
  const canvas = canvasHarness();
  const canvasListeners = new Map<string, Function>();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {}, setTimeout },
  });
  canvas.zoom = 2;
  canvas.offsetX = 10;
  canvas.offsetY = 20;
  canvas.canvas = {
    width: 1000,
    height: 800,
    style: {},
    addEventListener(type: string, listener: Function) { canvasListeners.set(type, listener); },
    getBoundingClientRect() { return { left: 0, top: 0 }; },
  };
  canvas.menuCanvas = {};
  canvas.container = { clientWidth: 1000, clientHeight: 800 };
  canvas.menu = {
    isClickingButton: () => false,
    getClickedOption: () => null,
    isOpen: () => false,
    getHoveredOption: () => null,
  };
  canvas.render = () => {};
  canvas.selectedTimelineIds = new Set();
  canvas.selectedChapterIds = new Set();
  canvas.selectedBranchIds = new Set();
  canvas.selectedTextboxIds = new Set();
  canvas.selectedLineIds = new Set();
  canvas.chapterClipboard = [];
  canvas.elementClipboard = { textboxes: [], lines: [] };
  canvas.timelineClipboardReady = false;
  canvas.insertionMode = false;
  canvas.branchInsertionMode = false;
  canvas.lineInsertionMode = false;
  canvas.placementMode = null;
  const created: Array<[string, number, number]> = [];
  canvas.onAddTimeline = (x: number, y: number) => created.push(['timeline', x, y]);
  canvas.onAddTextbox = (x: number, y: number) => created.push(['textbox', x, y]);
  canvas.onAddShape = (x: number, y: number) => created.push(['shape', x, y]);
  canvas.onAddImage = (x: number, y: number) => created.push(['image', x, y]);
  canvas.setupEventListeners();
  const click = (clientX: number, clientY: number) => canvasListeners.get('mousedown')!({
    button: 0, clientX, clientY, shiftKey: false, ctrlKey: false, metaKey: false,
  });
  const move = (clientX: number, clientY: number) => canvasListeners.get('mousemove')!({ clientX, clientY });

  canvas.togglePlacementMode('timeline');
  move(110, 20);
  assert.equal(canvas.canvas.style.cursor, 'not-allowed');
  click(110, 20); // world (50, 0), overlapping timeline A
  assert.equal(canvas.placementMode, 'timeline');
  assert.deepEqual(created, []);
  move(1010, 1020);
  assert.equal(canvas.canvas.style.cursor, 'crosshair');
  click(1010, 1020); // world (500, 500), grid aligned and empty
  assert.equal(canvas.placementMode, null);
  assert.deepEqual(created, [['timeline', 500, 500]]);

  for (const mode of ['textbox', 'shape', 'image'] as const) {
    canvas.togglePlacementMode(mode);
    click(210, 220); // world (100, 100)
    assert.equal(canvas.placementMode, null);
  }
  assert.deepEqual(created, [
    ['timeline', 500, 500],
    ['textbox', 100, 100],
    ['shape', 100, 100],
    ['image', 100, 100],
  ]);

  canvas.insertionMode = true;
  move(1010, 1020);
  assert.deepEqual(canvas.timelineCreationPreviewPoint, { x: 500, y: 500, kind: 'chapter', chapterGridLength: 1 });
  assert.equal(canvas.canvas.style.cursor, 'crosshair');

  canvas.insertionMode = false;
  canvas.branchInsertionMode = true;
  canvas.branchFirstPoint = { timelineId: 'timeline-a', position: 1 };
  move(1010, 1020);
  assert.deepEqual(canvas.timelineCreationPreviewPoint, { x: 500, y: 500, kind: 'branch', chapterGridLength: 0 });
  move(110, 20);
  assert.equal(canvas.timelineCreationPreviewPoint, null, 'preview disappears over an invalid occupied location');
});
