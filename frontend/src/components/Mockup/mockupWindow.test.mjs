import test from 'node:test';
import assert from 'node:assert/strict';
const { clampMockupPosition } = await import('./mockupWindow.mjs').catch(() => ({}));

test('keeps the whole floating editor inside desktop and narrow resized viewports', () => {
  assert.equal(typeof clampMockupPosition, 'function');
  assert.deepEqual(clampMockupPosition({ x: -400, y: -40 }, 1200, 900), { x: 8, y: 60 });
  assert.deepEqual(clampMockupPosition({ x: 5000, y: 5000 }, 1200, 900), { x: 812, y: 292 });
  const small = clampMockupPosition({ x: 900, y: 80 }, 320, 400);
  assert.ok(small.x >= 0 && small.x <= 8);
  assert.ok(small.y >= 0 && small.y <= 400);
});

test('dimensions and positions fit mobile portrait, landscape and short keyboards', async () => {
  const { getMockupSize } = await import('./mockupWindow.mjs');
  assert.equal(typeof getMockupSize, 'function');
  for (const [width, height] of [[360, 740], [390, 844], [740, 360], [360, 280], [240, 300]]) {
    const size = getMockupSize(width, height);
    const pos = clampMockupPosition({ x: -420, y: 9000 }, width, height);
    assert.ok(pos.x >= 0 && pos.x + size.width <= width - 8);
    assert.ok(pos.y >= 0 && pos.y + size.height <= height - 8);
    assert.ok(size.width > 0 && size.height > 0);
  }
});
