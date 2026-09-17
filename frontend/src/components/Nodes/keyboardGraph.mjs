export const isKeyboardNode = node => ['action_keyboard', 'action_reply_keyboard'].includes(node?.type);
export const isMessageNode = node => ['action_send_message', 'action_edit_message'].includes(node?.type);

/** Telegram constraint: a reply keyboard re-attaches only to sends; edits accept inline only. */
export function keyboardConnectionStatus(node, nodes, edges) {
  const target = node?.id;
  const sources = edges.filter(edge => edge.target === target)
    .map(edge => nodes.find(n => n.id === edge.source));
  const actualNode = nodes.find(candidate => candidate.id === target) || node;
  const mode = node?.data?.keyboard_type || (actualNode?.type === 'action_reply_keyboard' ? 'reply' : 'inline');
  const valid = sources.length === 1 && (sources[0]?.type === 'action_send_message' || (sources[0]?.type === 'action_edit_message' && mode === 'inline'));
  return { valid, connected: sources.length > 0, mode };
}


/** Derived presentation only: never persist validation colors in graph history. */
export function styleGraphEdges(nodes, edges, dirty) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const outgoing = new Map();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]);
  const reaches = (start, goal) => {
    const pending = [start], seen = new Set();
    while (pending.length) {
      const id = pending.pop();
      if (id === goal) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      pending.push(...(outgoing.get(id) || []));
    }
    return false;
  };
  return edges.map(edge => {
    const source = byId.get(edge.source), target = byId.get(edge.target);
    const invalid = edge.data?.error || !source || !target || reaches(edge.target, edge.source) ||
      (isKeyboardNode(target) && !keyboardConnectionStatus(target, nodes, edges).valid);
    const unsaved = dirty || edge.data?.unsaved;
    return { ...edge, animated: !invalid && !!unsaved, style: {
      ...edge.style,
      stroke: invalid ? 'var(--danger, #ef4444)' : unsaved ? 'var(--warning, #f59e0b)' : 'var(--accent, #3b82f6)',
      strokeWidth: 2.5,
      strokeDasharray: invalid ? '5 4' : unsaved ? '6 4' : undefined,
    } };
  });
}

/** Non-destructive, idempotent graph-load upgrade. Ambiguous existing keyboard branches
 * stay embedded and remain editable through the shared compatibility editor. */
export function migrateEmbeddedKeyboards(flow = {}) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const ids = new Set([...nodes, ...edges].map(item => item.id));
  const uniqueId = base => {
    let id = base, suffix = 1;
    while (ids.has(id)) id = `${base}_${suffix++}`;
    ids.add(id);
    return id;
  };
  const addedNodes = [], addedEdges = [], replacements = new Map();
  const upgradedNodes = nodes.map(node => {
    if (!isMessageNode(node) || !Array.isArray(node.data?.buttons) || !node.data.buttons.some(row => row?.length)) return node;
    // Inserting before an existing dedicated keyboard would invalidate its direct predecessor.
    if (edges.some(edge => edge.source === node.id && isKeyboardNode(nodes.find(n => n.id === edge.target)))) return node;
    const id = uniqueId(`${node.id}_keyboard`);
    const { buttons, keyboard_type = 'inline', ...data } = node.data;
    addedNodes.push({ id, type: 'action_keyboard', position: { x: (node.position?.x || 0) + 440, y: node.position?.y || 0 }, data: { buttons, keyboard_type } });
    addedEdges.push({ id: uniqueId(`${node.id}_keyboard_link`), source: node.id, sourceHandle: 'exec', target: id, targetHandle: 'exec' });
    replacements.set(node.id, id);
    return { ...node, data };
  });
  return { ...flow, nodes: [...upgradedNodes, ...addedNodes], edges: [...edges.map(edge => replacements.has(edge.source) ? { ...edge, source: replacements.get(edge.source), sourceHandle: 'exec' } : edge), ...addedEdges] };
}
