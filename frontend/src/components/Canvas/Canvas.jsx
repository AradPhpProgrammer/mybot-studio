import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider
} from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';
import MathNode from '../Nodes/MathNode';

export default function Canvas(props) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>;
}

function CanvasInner({
  nodes, edges,
  onNodesChange, onEdgesChange, onConnect, onNodeClick,
  onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu,
  onAddNodeAt, onDeleteNode, onDeleteEdge,
  theme, dirty
}) {
  const nodeTypes = useMemo(() => ({
    trigger_start: TriggerNode,
    trigger_command: TriggerNode,
    trigger_callback: TriggerNode,
    trigger_message: TriggerNode,
    action_send_message: MessageNode,
    action_edit_message: MessageNode,
    action_condition: ConditionNode,
    action_set_variable: ActionNode,
    math_add: MathNode,
    math_subtract: MathNode,
    math_multiply: MathNode,
    math_divide: MathNode,
    action_delay: ActionNode,
    action_http_request: ActionNode,
    action_answer_callback: ActionNode
  }), []);

  const [contextMenu, setContextMenu] = useState(null); // {x, y, type: 'pane'|'node'|'edge', id}
  const { screenToFlowPosition } = useReactFlow();

  // Close menu on outside click / escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const key = (e) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', key); };
  }, [contextMenu]);

  // Default edge options: style based on save state
  const defaultEdgeOptions = useMemo(() => ({
    animated: !dirty,
    style: { stroke: dirty ? 'var(--warning)' : 'var(--accent)', strokeWidth: 2.5, strokeDasharray: dirty ? '6 4' : undefined }
  }), [dirty]);

  const handlePaneCtx = (e) => {
    e.preventDefault();
    const point = { x: e.clientX, y: e.clientY };
    onPaneContextMenu?.(point);
    setContextMenu({ ...point, type: 'pane' });
  };

  const handleNodeCtx = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', id: node.id });
  };

  const handleEdgeCtx = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', id: edge.id });
  };

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={handleNodeCtx}
        onEdgeContextMenu={handleEdgeCtx}
        onPaneContextMenu={handlePaneCtx}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable
        nodesFocusable
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className={theme === 'dark' ? 'dark-canvas' : 'light-canvas'}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background color={theme === 'dark' ? '#26334a' : '#cbd5e1'} gap={18} size={2} />
        <Controls className="!bg-surface !border-border !rounded-xl !shadow-lg !overflow-hidden [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap className="!bg-surface/90 !border-border !rounded-xl !shadow-lg !overflow-hidden" nodeColor={() => (theme === 'dark' ? '#334155' : '#cbd5e1')} maskColor={theme === 'dark' ? 'rgba(10,15,24,0.75)' : 'rgba(255,255,255,0.75)'} />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[60] bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'pane' && (
            <button onClick={() => { const pos = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y }); onAddNodeAt?.(contextMenu.x, contextMenu.y, pos); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors">
              <Plus size={14} className="text-accent" /> Add Node Here
            </button>
          )}
          {(contextMenu.type === 'node' || contextMenu.type === 'edge') && (
            <>
              <button onClick={() => { onDeleteNode?.(contextMenu.id); setContextMenu(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${contextMenu.type === 'node' ? 'text-foreground hover:bg-surface-secondary' : 'hidden'}`}>
                <Trash2 size={14} className="text-danger" /> Delete Node
              </button>
              <button onClick={() => { onDeleteEdge?.(contextMenu.id); setContextMenu(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${contextMenu.type === 'edge' ? 'text-foreground hover:bg-surface-secondary' : 'hidden'}`}>
                <Trash2 size={14} className="text-danger" /> Delete Connection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}