import test from 'node:test';
import assert from 'node:assert/strict';
const graph = await import('./keyboardGraph.mjs').catch(() => ({}));

test('migrates embedded markup into a dedicated node without losing branch edges or button metadata', () => {
  assert.equal(typeof graph.migrateEmbeddedKeyboards, 'function');
  const buttons = [[{ text: 'خانه', callback_data: 'home', style: 'success', icon_custom_emoji_id: '123' }]];
  const flow = { name: 'Flow', nodes: [
    { id: 'send', type: 'action_send_message', position: { x: 10, y: 20 }, data: { text: 'Hi', keyboard_type: 'reply', buttons } },
    { id: 'next', type: 'action_delay', data: { seconds: 2 } },
  ], edges: [{ id: 'out', source: 'send', sourceHandle: 'exec', target: 'next', targetHandle: 'exec', data: { custom: true } }] };
  const before = structuredClone(flow);
  const result = graph.migrateEmbeddedKeyboards(flow);
  const keyboard = result.nodes.find(n => n.type === 'action_keyboard');
  assert.deepEqual(keyboard.data, { keyboard_type: 'reply', buttons });
  assert.deepEqual(result.nodes.find(n => n.id === 'send').data, { text: 'Hi' });
  assert.equal(result.edges.find(e => e.id === 'out').source, keyboard.id);
  assert.equal(result.edges.find(e => e.id === 'out').data.custom, true);
  assert.ok(result.edges.some(e => e.source === 'send' && e.target === keyboard.id));
  assert.equal(result.name, 'Flow');
  assert.deepEqual(flow, before);
  assert.deepEqual(graph.migrateEmbeddedKeyboards(result), result);
  const withExisting = { ...flow, nodes: [...flow.nodes, { id: 'existing', type: 'action_keyboard', data: { buttons: [[{ text: 'B' }]] } }], edges: [...flow.edges, { id: 'existing-edge', source: 'send', target: 'existing' }] };
  assert.deepEqual(graph.migrateEmbeddedKeyboards(withExisting), withExisting);
  const collision = { ...flow, nodes: [...flow.nodes, { id: 'send_keyboard', type: 'action_delay' }] };
  const collisionResult = graph.migrateEmbeddedKeyboards(collision);
  assert.equal(new Set(collisionResult.nodes.map(n => n.id)).size, collisionResult.nodes.length);
});

test('keyboard attachment accepts direct sends and inline edits, rejects reply edits and indirect sources', () => {
  assert.equal(typeof graph.keyboardConnectionStatus, 'function');
  const send = { id: 'send', type: 'action_send_message' };
  const edit = { id: 'edit', type: 'action_edit_message' };
  const delay = { id: 'delay', type: 'action_delay' };
  for (const mode of ['inline', 'reply']) {
    const keyboard = { id: 'kb', type: 'action_keyboard', data: { keyboard_type: mode } };
    const nodes = [send, edit, delay, keyboard];
    assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, []).valid, false);
    assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, [{ source: 'send', target: 'kb' }, { source: 'missing', target: 'kb' }]).valid, false);
    for (const source of [send, edit, delay]) {
      const edge = { source: source.id, target: 'kb' };
      assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, [edge]).valid,
        source === send || (source === edit && mode === 'inline'));
    }
    assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, [{ source: 'send', target: 'kb' }, { source: 'delay', target: 'kb' }]).valid, false);
  }
});

test('legacy reply alias defaults to reply and rejects an edit predecessor', () => {
  const edit = { id: 'edit', type: 'action_edit_message' };
  const keyboard = { id: 'kb', type: 'action_reply_keyboard', data: {} };
  const nodes = [edit, keyboard];
  const edges = [{ id: 'link', source: 'edit', target: 'kb' }];
  assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, edges).mode, 'reply');
  assert.equal(graph.keyboardConnectionStatus(keyboard, nodes, edges).valid, false);
  assert.equal(graph.styleGraphEdges(nodes, edges, false)[0].style.stroke, 'var(--danger, #ef4444)');
});

test('invalid connections stay red even when persisted styles or unsaved flags disagree', () => {
  assert.equal(typeof graph.styleGraphEdges, 'function');
  const nodes = [
    { id: 'send', type: 'action_send_message' },
    { id: 'edit', type: 'action_edit_message' },
    { id: 'kb', type: 'action_keyboard', data: { keyboard_type: 'reply' } },
  ];
  const edge = { id: 'edge', source: 'edit', target: 'kb', style: { stroke: 'blue', strokeDasharray: 'none' } };
  const [invalid] = graph.styleGraphEdges(nodes, [edge], true);
  assert.equal(invalid.style.stroke, 'var(--danger, #ef4444)');
  assert.equal(invalid.style.strokeDasharray, '5 4');
  assert.equal(invalid.animated, false);
  assert.equal(edge.style.stroke, 'blue');
  const cycle = [{ id: 'a', source: 'send', target: 'edit' }, { id: 'b', source: 'edit', target: 'send' }];
  assert.ok(graph.styleGraphEdges(nodes, cycle, false).every(e => e.style.stroke === 'var(--danger, #ef4444)'));
  const [valid] = graph.styleGraphEdges(nodes, [{ ...edge, source: 'send' }], false);
  assert.notEqual(valid.style.stroke, 'var(--danger, #ef4444)');
  for (const bad of [ { ...edge, target: 'missing' }, { ...edge, source: 'kb', target: 'kb' }, { ...edge, source: 'send', data: { error: true } } ]) {
    assert.equal(graph.styleGraphEdges(nodes, [bad], false)[0].style.stroke, 'var(--danger, #ef4444)');
  }
});
