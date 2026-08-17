import assert from 'node:assert/strict';
import test from 'node:test';
import { handleSaveShortcut } from '../src/saveShortcut';

function shortcut(key: string, ctrlKey = false, metaKey = false) {
  let prevented = false;
  return {
    event: { key, ctrlKey, metaKey, preventDefault() { prevented = true; } },
    wasPrevented: () => prevented,
  };
}

test('Ctrl/Cmd+S opens the export chooser and suppresses browser save', () => {
  for (const [ctrlKey, metaKey] of [[true, false], [false, true]]) {
    const input = shortcut('s', ctrlKey, metaKey);
    let opened = 0;
    assert.equal(handleSaveShortcut(input.event, true, () => { opened++; }), true);
    assert.equal(input.wasPrevented(), true);
    assert.equal(opened, 1);
  }
});

test('save shortcut leaves unrelated keys and the no-project screen alone', () => {
  const unrelated = shortcut('p', true);
  const noProject = shortcut('s', true);
  let opened = 0;
  assert.equal(handleSaveShortcut(unrelated.event, true, () => { opened++; }), false);
  assert.equal(handleSaveShortcut(noProject.event, false, () => { opened++; }), false);
  assert.equal(unrelated.wasPrevented(), false);
  assert.equal(noProject.wasPrevented(), false);
  assert.equal(opened, 0);
});
