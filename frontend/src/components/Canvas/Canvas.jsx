import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';

import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';
import MathNode from '../Nodes/MathNode';
import LoopNode from '../Nodes/LoopNode';
import { useI18n } from '../../locales/i18n';

export default function Canvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  onAddNodeAt,
  onDeleteNode,
  onDeleteEdge,
  theme,
  dirty
}) {
  const { t } = useI18n();

  const nodeTypes = useMemo(
    () => ({
      trigger_start: TriggerNode,
      trigger_command: TriggerNode,
      trigger_callback: TriggerNode,
      trigger_message: TriggerNode,
      action_send_message: MessageNode,
      action_edit_message: MessageNode,
      action_condition: ConditionNode,
      action_set_variable: ActionNode,
      action_loop: LoopNode,
      math_add: MathNode,
      math_subtract: MathNode,
      math_multiply: MathNode,
      math_divide: MathNode,
      action_delay: ActionNode,
      action_http_request: ActionNode,
      action_answer_callback: ActionNode
    }),
    []
  );

  const [contextMenu, setContextMenu] = useState(null); // {x, y, type: 'pane'|'node'|'edge', id}
  const { screenToFlowPosition } = useReactFlow();

  // Close menu on outside click / escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const key = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', key);
    };
  }, [contextMenu]);

  // Compute styled edges: dashed=unsaved, solid=saved, dashed-red=error
  const styledEdges = useMemo(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    return edges.map((edge) => {
      const isMissingNode = !nodeIds.has(edge.source) || !nodeIds.has(edge.target);
      const isError = edge.data?.error || isMissingNode;

      let stroke = 'var(--accent, #3b82f6)';
      let strokeDasharray = undefined;
      let animated = !dirty;

      if (isError) {
        // Error state: Dashed Red
        stroke = '#ef4444';
        strokeDasharray = '5 4';
        animated = false;
      } else if (dirty || edge.data?.unsaved) {
        // Unsaved state: Dashed Warning/Amber
        stroke = 'var(--warning, #f59e0b)';
        strokeDasharray = '6 4';
        animated = true;
      } else {
        // Saved state: Solid Accent Blue
        stroke = 'var(--accent, #3b82f6)';
        strokeDasharray = undefined;
        animated = false;
      }

      return {
        ...edge,
        animated,
        style: {
          stroke,
          strokeWidth: 2.5,
          strokeDasharray,
          ...(edge.style || {})
        }
      };
    });
  }, [edges, nodes, dirty]);

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

  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={handleNodeCtx}
        onEdgeContextMenu={handleEdgeCtx}
        onPaneContextMenu={handlePaneCtx}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable
        nodesFocusable
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className={isDark ? 'dark-canvas' : 'light-canvas'}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background
          color={isDark ? '#334155' : '#cbd5e1'}
          gap={20}
          size={2}
        />
        <Controls className="!bg-surface !border-border !rounded-xl !shadow-lg !overflow-hidden [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          className="!bg-surface/95 !border-border !rounded-xl !shadow-lg !overflow-hidden"
          nodeColor={() => (isDark ? '#475569' : '#cbd5e1')}
          maskColor={isDark ? 'rgba(10,15,24,0.8)' : 'rgba(255,255,255,0.8)'}
        />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[60] bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'pane' && (
            <button
              onClick={() => {
                const pos = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
                onAddNodeAt?.(contextMenu.x, contextMenu.y, pos);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors"
            >
              <Plus size={14} className="text-accent" />
              <span>{t('canvas.add_node_here') || 'Add Node Here'}</span>
            </button>
          )}
          {(contextMenu.type === 'node' || contextMenu.type === 'edge') && (
            <>
              <button
                onClick={() => {
                  onDeleteNode?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${
                  contextMenu.type === 'node' ? 'text-foreground hover:bg-surface-secondary' : 'hidden'
                }`}
              >
                <Trash2 size={14} className="text-danger" />
                <span>{t('canvas.delete_node') || 'Delete Node'}</span>
              </button>
              <button
                onClick={() => {
                  onDeleteEdge?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${
                  contextMenu.type === 'edge' ? 'text-foreground hover:bg-surface-secondary' : 'hidden'
                }`}
              >
                <Trash2 size={14} className="text-danger" />
                <span>{t('canvas.delete_connection') || 'Delete Connection'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
