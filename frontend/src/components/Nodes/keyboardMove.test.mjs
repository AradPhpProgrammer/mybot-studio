import test from 'node:test';
import assert from 'node:assert/strict';
import { moveKeyboardButton } from './keyboardMove.mjs';

const a = Object.freeze({ text: 'A', callback_data: 'a', style: 'primary' });
const b = Object.freeze({ text: 'B', url: 'https://example.com', style: 'success' });
const c = Object.freeze({ text: 'C', request_contact: true, style: 'danger' });
const frozenRows = (...rows) => Object.freeze(rows.map(Object.freeze));

test('moves right to a pre-move insertion slot without mutating metadata or input', () => {
  const rows = frozenRows([a, b, c]);
  const result = moveKeyboardButton(rows, { r: 0, c: 0 }, { r: 0, c: 2 });
  assert.deepEqual(result, { buttons: [[b, a, c]], position: { r: 0, c: 1 } });
  assert.equal(result.buttons[0][1], a);
  assert.deepEqual(rows, [[a, b, c]]);
});

test('moves left and to the final insertion slot', () => {
  assert.deepEqual(moveKeyboardButton([[a, b, c]], { r: 0, c: 2 }, { r: 0, c: 0 }),
    { buttons: [[c, a, b]], position: { r: 0, c: 0 } });
  assert.deepEqual(moveKeyboardButton([[a, b, c]], { r: 0, c: 0 }, { r: 0, c: 3 }),
    { buttons: [[b, c, a]], position: { r: 0, c: 2 } });
});

test('moves inline or reply payloads between rows and tracks selection after removing source row', () => {
  assert.deepEqual(moveKeyboardButton(frozenRows([a], [b, c]), { r: 0, c: 0 }, { r: 1, c: 1 }),
    { buttons: [[b, a, c]], position: { r: 0, c: 1 } });
  assert.deepEqual(moveKeyboardButton(frozenRows([a, b], [c]), { r: 1, c: 0 }, { r: 0, c: 0 }),
    { buttons: [[c, a, b]], position: { r: 0, c: 0 } });
});

test('creates a new last row, including from a singleton source row', () => {
  assert.deepEqual(moveKeyboardButton([[a, b], [c]], { r: 0, c: 0 }, { r: 2, c: 0 }),
    { buttons: [[b], [c], [a]], position: { r: 2, c: 0 } });
  assert.deepEqual(moveKeyboardButton([[a], [b]], { r: 0, c: 0 }, { r: 2, c: 0 }),
    { buttons: [[b], [a]], position: { r: 1, c: 0 } });
});

test('same slot and adjacent self-drop do not change button order', () => {
  for (const c of [0, 1]) assert.deepEqual(moveKeyboardButton([[a, b]], { r: 0, c: 0 }, { r: 0, c }),
    { buttons: [[a, b]], position: { r: 0, c: 0 } });
});

test('rejects stale, malformed and out-of-bounds moves without data loss', () => {
  const rows = frozenRows([a]);
  for (const [from, to] of [
    [null, { r: 0, c: 0 }], [{ r: 9, c: 0 }, { r: 0, c: 0 }],
    [{ r: 0, c: 1 }, { r: 0, c: 0 }], [{ r: 0, c: 0 }, { r: 2, c: 0 }],
    [{ r: 0, c: 0 }, { r: 0, c: 2 }], [{ r: 0, c: 0 }, { r: 1, c: 1 }],
    [{ r: -1, c: 0 }, { r: 0, c: 0 }], [{ r: 0, c: 0 }, { r: 0.5, c: 0 }],
  ]) assert.deepEqual(moveKeyboardButton(rows, from, to), { buttons: rows, position: null });
});

test('handles empty grids and pre-existing empty rows safely', () => {
  assert.deepEqual(moveKeyboardButton([], { r: 0, c: 0 }, { r: 0, c: 0 }), { buttons: [], position: null });
  assert.deepEqual(moveKeyboardButton([[], [a], [b]], { r: 2, c: 0 }, { r: 1, c: 1 }),
    { buttons: [[a, b]], position: { r: 0, c: 1 } });
});
