import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNodeChanges, addEdge, applyEdgeChanges } from '@xyflow/react';
import { createGraphHistory, graphHistoryShortcut, cursorToFlowPosition } from './graphHistory.js';
import * as graphTools from './graphHistory.js';

test('save persists its captured snapshot without clearing edits made while awaiting the API', async () => {
  const history = createGraphHistory({ nodes: [node], edges: [] });
  history.update(g => ({ ...g, nodes: [{ ...node, data: { text: 'submitted' } }] }));
  await Promise.resolve();
  let complete;
  let payload;
  const pending = graphTools.persistGraphSnapshot({
    history, botId: 7,
    saveFlow: async (id, flow) => {
      assert.equal(id, 7);
      payload = flow;
      await new Promise(resolve => { complete = resolve; });
    },
    syncCommands: async () => {},
  });
  history.update(g => ({ ...g, nodes: [{ ...node, data: { text: 'newer' } }] }));
  await Promise.resolve();
  complete();
  assert.equal((await pending).status, 'saved');
  assert.equal(payload.nodes[0].data.text, 'submitted');
  assert.equal(history.isDirty(), true);
  history.undo();
  assert.equal(history.getSnapshot().nodes[0].data.text, 'submitted');
  assert.equal(history.isDirty(), false);
  history.redo();
  assert.equal(history.getSnapshot().nodes[0].data.text, 'newer');
  assert.equal(history.isDirty(), true);
});

test('save failure stays dirty and is distinct from command-sync failure after persistence', async () => {
  const history = createGraphHistory({ nodes: [node], edges: [] });
  history.update(g => ({ ...g, nodes: [{ ...node, data: { text: 'edited' } }] }));
  const error = new Error('offline');
  const failure = await graphTools.persistGraphSnapshot({ history, botId: 1,
    saveFlow: async () => { throw error; }, syncCommands: async () => assert.fail('must not sync'),
  });
  assert.deepEqual(failure, { status: 'save-error', error });
  assert.equal(history.isDirty(), true);
  const warning = await graphTools.persistGraphSnapshot({ history, botId: 1,
    saveFlow: async () => {}, syncCommands: async () => { throw error; },
  });
  assert.deepEqual(warning, { status: 'sync-error', error });
  assert.equal(history.isDirty(), false);
});

test('late save completion after switching bots cannot change the new graph saved baseline', async () => {
  const history = createGraphHistory({ nodes: [node], edges: [] });
  let finish;
  let current = true;
  const pending = graphTools.persistGraphSnapshot({ history, botId: 1,
    isCurrent: () => current,
    saveFlow: () => new Promise(resolve => { finish = resolve; }),
    syncCommands: async () => {},
  });
  current = false;
  history.reset({ nodes: [{ ...node, id: 'other' }], edges: [] });
  finish();
  assert.equal((await pending).status, 'stale');
  assert.equal(history.isDirty(), false);
});

test('dirty state excludes selection/measurement and tracks save and undo', async () => {
  const h = createGraphHistory({ nodes: [node], edges: [] });
  h.update(g => ({ ...g, nodes: g.nodes.map(n => ({ ...n, selected: true, measured: { width: 200, height: 80 } })) }));
  assert.equal(h.isDirty(), false);
  assert.equal(h.undo(), false);
  h.update(g => ({ ...g, nodes: g.nodes.map(n => ({ ...n, data: { text: 'changed' } })) }));
  assert.equal(h.isDirty(), true);
  h.markSaved(h.getSnapshot());
  assert.equal(h.isDirty(), false);
  h.undo();
  assert.equal(h.isDirty(), true);
  h.redo();
  assert.equal(h.isDirty(), false);
});

test('saving publishes dirty-state changes even when graph references stay the same', () => {
  const h = createGraphHistory({ nodes: [node], edges: [] });
  h.update(g => ({ ...g, nodes: [{ ...node, data: { text: 'edited' } }] }));
  const observed = [];
  h.subscribe(() => observed.push(h.isDirty()));
  const snapshot = h.getSnapshot();
  h.markSaved();
  assert.deepEqual(observed, [false]);
  assert.equal(h.getSnapshot(), snapshot);
});

test('drag frames are one transaction and new edits invalidate redo', async () => {
  const h = createGraphHistory({ nodes: [node], edges: [] });
  h.begin();
  for (const x of [10, 20, 30]) {
    h.update(g => ({ ...g, nodes: g.nodes.map(n => ({ ...n, position: { x, y: 0 }, dragging: true })) }));
    await Promise.resolve();
  }
  h.end();
  h.undo();
  assert.equal(h.getSnapshot().nodes[0].position.x, 0);
  assert.equal(h.undo(), false);
  h.redo();
  assert.equal(h.getSnapshot().nodes[0].position.x, 30);
  assert.equal(h.getSnapshot().nodes[0].dragging, false);
  h.undo();
  h.update(g => ({ ...g, nodes: [...g.nodes, { ...node, id: 'b' }] }));
  assert.equal(h.redo(), false);
});

test('node deletion and connected edge deletion undo atomically; load resets history', () => {
  const h = createGraphHistory({ nodes: [node], edges: [{ id: 'e', source: 'a', target: 'a' }] });
  h.update(g => ({ ...g, nodes: [] }));
  h.update(g => ({ ...g, edges: [] }));
  h.undo();
  assert.equal(h.getSnapshot().nodes.length, 1);
  assert.equal(h.getSnapshot().edges.length, 1);
  h.redo();
  assert.deepEqual(h.getSnapshot(), { nodes: [], edges: [] });
  h.reset({ nodes: [{ ...node, id: 'other-bot' }], edges: [] });
  assert.equal(h.undo(), false);
  assert.equal(h.redo(), false);
  assert.equal(h.isDirty(), false);
});

test('Ctrl+Z / Shift+Z / Y and Meta equivalents ignore native text editing', () => {
  for (const modifier of ['ctrlKey', 'metaKey']) {
    assert.equal(graphHistoryShortcut({ key: 'z', [modifier]: true }), 'undo');
    assert.equal(graphHistoryShortcut({ key: 'Z', shiftKey: true, [modifier]: true }), 'redo');
    assert.equal(graphHistoryShortcut({ key: 'y', [modifier]: true }), 'redo');
    for (const target of [{ isContentEditable: true }, { closest: selector => selector === '[data-graph-editor]' ? null : { tagName: 'INPUT' } }]) {
      assert.equal(graphHistoryShortcut({ key: 'z', [modifier]: true, target }), null);
    }
  }
  assert.equal(graphHistoryShortcut({ key: 'ظ', code: 'KeyZ', ctrlKey: true }), 'undo');
  assert.equal(graphHistoryShortcut({ key: 'ظ', code: 'KeyZ', ctrlKey: true, shiftKey: true }), 'redo');
  assert.equal(graphHistoryShortcut({ key: 'غ', code: 'KeyY', ctrlKey: true }), 'redo');
  assert.equal(graphHistoryShortcut({ key: 'z' }), null);
});

test('graph text/button fields use graph undo, while settings and simulator inputs stay native', () => {
  const target = { closest: selector => selector === '[data-graph-editor]' ? {} : { tagName: 'INPUT' } };
  assert.equal(graphHistoryShortcut({ key: 'ظ', code: 'KeyZ', ctrlKey: true, target }), 'undo');
  assert.equal(graphHistoryShortcut({ key: 'ظ', code: 'KeyZ', ctrlKey: true, shiftKey: true, target }), 'redo');
  const unrelated = { closest: selector => selector === '[data-graph-editor]' ? null : { tagName: 'INPUT' } };
  assert.equal(graphHistoryShortcut({ key: 'z', ctrlKey: true, target: unrelated }), null);
});

test('save shortcut supports Shift, Meta and Persian physical KeyS', () => {
  for (const modifier of ['ctrlKey', 'metaKey']) {
    for (const shiftKey of [false, true]) {
      assert.equal(graphTools.isSaveShortcut({ code: 'KeyS', key: 'س', [modifier]: true, shiftKey }), true);
      assert.equal(graphTools.isSaveShortcut({ key: 'S', [modifier]: true, shiftKey }), true);
    }
  }
  assert.equal(graphTools.isSaveShortcut({ key: 's' }), false);
  assert.equal(graphTools.isSaveShortcut({ key: 's', ctrlKey: true, isComposing: true }), false);
});

test('cursor conversion preserves zero and disables snapping with pan/zoom/bounds', () => {
  const convert = (point, options) => {
    assert.equal(options.snapToGrid, false);
    return { x: (point.x - 100 - 25) / 2, y: (point.y - 50 + 40) / 2 };
  };
  assert.deepEqual(cursorToFlowPosition(convert, { x: 125, y: 10 }), { x: 0, y: 0 });
});

const node = { id: 'a', position: { x: 0, y: 0 }, data: { text: 'before' } };
test('add node, connect, and remove edge each undo and redo independently', async () => {
  const h = createGraphHistory({ nodes: [node], edges: [] });
  h.update(g => ({ ...g, nodes: [...g.nodes, { ...node, id: 'b' }] }));
  await Promise.resolve();
  h.update(g => ({ ...g, edges: addEdge({ source: 'a', target: 'b' }, g.edges) }));
  await Promise.resolve();
  const edgeId = h.getSnapshot().edges[0].id;
  h.update(g => ({ ...g, edges: applyEdgeChanges([{ type: 'remove', id: edgeId }], g.edges) }));
  h.undo();
  assert.equal(h.getSnapshot().edges.length, 1);
  h.undo();
  assert.equal(h.getSnapshot().edges.length, 0);
  assert.equal(h.getSnapshot().nodes.length, 2);
  h.undo();
  assert.equal(h.getSnapshot().nodes.length, 1);
  h.redo(); h.redo(); h.redo();
  assert.equal(h.getSnapshot().nodes.length, 2);
  assert.equal(h.getSnapshot().edges.length, 0);
});
test('button label, callback identifier and color replacements track dirty and undo independently', async () => {
  const original = { ...node, data: { buttons: [[{ text: 'First', callback_data: 'first', style: 'default' }]] } };
  const history = createGraphHistory({ nodes: [original], edges: [] });
  for (const [field, value] of [['text', 'دکمه'], ['callback_data', 'next'], ['style', 'success']]) {
    history.update(graph => ({ ...graph, nodes: applyNodeChanges([
      { type: 'replace', id: 'a', item: { ...graph.nodes[0], data: { buttons: [[{ ...graph.nodes[0].data.buttons[0][0], [field]: value }]] } } },
    ], graph.nodes) }));
    await Promise.resolve();
    assert.equal(history.isDirty(), true);
  }
  history.undo();
  assert.equal(history.getSnapshot().nodes[0].data.buttons[0][0].style, 'default');
  history.undo();
  assert.equal(history.getSnapshot().nodes[0].data.buttons[0][0].callback_data, 'first');
  history.undo();
  assert.equal(history.getSnapshot().nodes[0].data.buttons[0][0].text, 'First');
  assert.equal(history.isDirty(), false);
  history.redo(); history.redo(); history.redo();
  assert.deepEqual(history.getSnapshot().nodes[0].data.buttons, [[{ text: 'دکمه', callback_data: 'next', style: 'success' }]]);
});

test('node data replacement from ReactFlow setNodes is undoable and redoable', () => {
  const history = createGraphHistory({ nodes: [node], edges: [] });
  history.update(graph => ({ ...graph, nodes: applyNodeChanges([
    { type: 'replace', id: 'a', item: { ...node, data: { text: 'after' } } },
  ], graph.nodes) }));
  history.undo();
  assert.equal(history.getSnapshot().nodes[0].data.text, 'before');
  history.redo();
  assert.equal(history.getSnapshot().nodes[0].data.text, 'after');
});
