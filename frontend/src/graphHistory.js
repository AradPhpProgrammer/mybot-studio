// Graph history lives above ReactFlow: controlled `replace` changes from
// useReactFlow().setNodes reach the same history as canvas edits.
const clone = (value) => structuredClone(value);
const fingerprint = (graph) => JSON.stringify({
  nodes: graph.nodes.map(({ selected, dragging, measured, resizing, ...node }) => node),
  edges: graph.edges.map(({ selected, ...edge }) => edge),
});

export function createGraphHistory(initial = { nodes: [], edges: [] }, limit = 100) {
  let graph = clone(initial);
  let saved = fingerprint(graph);
  let past = [];
  let future = [];
  let pending = null;
  let transaction = false;
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());
  const commit = () => {
    if (!pending || transaction) return;
    if (fingerprint(pending) !== fingerprint(graph)) {
      past.push(pending);
      if (past.length > limit) past.shift();
      future = [];
    }
    pending = null;
  };
  const restore = (value) => ({
    nodes: clone(value.nodes).map(node => ({ ...node, dragging: false, resizing: false })),
    edges: clone(value.edges),
  });
  return {
    getSnapshot: () => graph,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    update(updater) {
      const next = typeof updater === 'function' ? updater(graph) : updater;
      if (fingerprint(next) !== fingerprint(graph)) pending ??= clone(graph);
      graph = next;
      notify();
      // Node + incident-edge deletion (and other synchronous paired edits)
      // must be a single graph transaction, not two undo steps.
      queueMicrotask(commit);
    },
    markSaved(value = graph) { saved = fingerprint(value); notify(); },
    isDirty() { return saved !== fingerprint(graph); },
    begin() { commit(); transaction = true; },
    end() { transaction = false; commit(); },
    undo() {
      if (transaction) return false;
      commit();
      if (!past.length) return false;
      future.push(clone(graph));
      graph = restore(past.pop());
      notify();
      return true;
    },
    redo() {
      if (transaction) return false;
      commit();
      if (!future.length) return false;
      past.push(clone(graph));
      graph = restore(future.pop());
      notify();
      return true;
    },
    reset(next = { nodes: [], edges: [] }) {
      past = []; future = []; pending = null; transaction = false;
      graph = clone(next);
      saved = fingerprint(graph);
      notify();
    },
  };
}

// Capture the store synchronously, not a potentially stale React render closure.
// saveFlow and syncCommands errors are surfaced as distinct statuses so the UI
// can show localized messages instead of swallowing them.
export async function persistGraphSnapshot({ history, botId, isCurrent, saveFlow, syncCommands }) {
  const snapshot = clone(history.getSnapshot());
  try {
    await saveFlow(botId, {
      name: 'Main Flow', ...snapshot, viewport: { x: 0, y: 0, zoom: 1 },
    });
  } catch (error) {
    return { status: 'save-error', error };
  }
  // A bot switch must not let a stale save mark the new bot's graph as clean.
  if (isCurrent && !isCurrent()) return { status: 'stale' };
  history.markSaved(snapshot);
  try {
    await syncCommands(botId);
  } catch (error) {
    return { status: 'sync-error', error };
  }
  return { status: 'saved' };
}

export function isTextEditing(target) {
  return !!(target?.isContentEditable || target?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
  ));
}

export function isSaveShortcut(event) {
  return !!(!event.defaultPrevented && !event.isComposing && !event.altKey &&
    (event.ctrlKey || event.metaKey) && (event.code === 'KeyS' || event.key?.toLowerCase() === 's'));
}

export function graphHistoryShortcut(event) {
  if (event.defaultPrevented || event.isComposing || event.altKey ||
      !(event.ctrlKey || event.metaKey)) return null;
  // Controlled graph fields must restore graph data, not the browser's text stack.
  // Unrelated settings and simulator inputs retain native undo/redo.
  if (isTextEditing(event.target) && !event.target?.closest?.('[data-graph-editor]')) return null;
  const key = event.code === 'KeyZ' ? 'z' : event.code === 'KeyY' ? 'y' : event.key?.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y') return 'redo';
  return null;
}

// ReactFlow already subtracts the canvas bounds. Disable grid snapping here:
// insertion must use the original cursor position, not a nearby grid point.
export function cursorToFlowPosition(screenToFlowPosition, point) {
  return screenToFlowPosition({ x: point.x, y: point.y }, { snapToGrid: false });
}
