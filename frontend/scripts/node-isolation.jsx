// Test-only entry: production node components, styles and graph history.
import React, { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, ReactFlowProvider, applyNodeChanges } from '@xyflow/react';
import MessageNode from '../src/components/Nodes/MessageNode.jsx';
import EditMessageNode from '../src/components/Nodes/EditMessageNode.jsx';
import { createGraphHistory } from '../src/graphHistory.js';
import { I18nProvider } from '../src/locales/i18n.jsx';
import '../src/index.css';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'light' ? 'light' : 'dark';
const type = params.get('node') === 'edit' ? 'action_edit_message' : 'action_send_message';
document.documentElement.dataset.theme = theme;
document.documentElement.className = theme;
const nodeTypes = { action_send_message: MessageNode, action_edit_message: EditMessageNode };
function Fixture() {
  const [history] = useState(() => createGraphHistory({
    nodes: [{ id: 'subject', type, position: { x: 40, y: 50 }, data: {
      text: 'Original fixture text',
      buttons: [[{ text: 'Fixture button', callback_data: 'fixture' }]],
    } }], edges: [],
  }));
  const graph = useSyncExternalStore(history.subscribe, history.getSnapshot);
  const dirty = useSyncExternalStore(history.subscribe, history.isDirty);
  return <>
    <output data-testid="dirty" style={{ position: 'fixed', top: 4, left: 4 }}>{dirty ? 'dirty' : 'clean'}</output>
    <div style={{ width: '100vw', height: '90vh', marginTop: 30 }}>
      <ReactFlowProvider>
        <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} colorMode={theme}
          onNodesChange={changes => history.update(g => ({ ...g, nodes: applyNodeChanges(changes, g.nodes) }))}
        />
      </ReactFlowProvider>
    </div>
  </>;
}
createRoot(document.getElementById('root')).render(<I18nProvider><Fixture /></I18nProvider>);
