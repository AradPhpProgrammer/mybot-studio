import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');
test('App consumes history and dirty subscriptions rather than disconnected node state', () => {
  assert.match(app, /useSyncExternalStore\(history.subscribe, history.getSnapshot/);
  assert.match(app, /useSyncExternalStore\(history.subscribe, history.isDirty/);
  assert.doesNotMatch(app, /useNodesState|useEdgesState|setIsDirty/);
  assert.match(app, /applyNodeChanges\(changes, graph.nodes\)/);
  assert.match(app, /persistGraphSnapshot\(/);
});
test('App wires capture shortcuts, graph input scope, live selection and drag boundaries', () => {
  assert.match(app, /addEventListener\('keydown', handleKeyDown, true\)/);
  assert.match(app, /data-graph-editor/);
  assert.match(app, /nodes.find\(node => node.id === selectedNodeId\)/);
  for (const name of ['onNodeDragStart', 'onNodeDragStop', 'onSelectionDragStart', 'onSelectionDragStop']) assert.match(app, new RegExp(name + '='));
  assert.match(app, /migrateEmbeddedKeyboards\(flow\)/);
  assert.match(app, /setPendingNodePos\(flowPos/);
});
