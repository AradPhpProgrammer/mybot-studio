import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import { Plus, Trash2, Unlink } from 'lucide-react';

import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';
import MathNode from '../Nodes/MathNode';
import LoopNode from '../Nodes/LoopNode';
import EditMessageNode from '../Nodes/EditMessageNode';
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
  dirty,
  onNodeDoubleClick
}) {
  const { t } = useI18n();

  const nodeTypes = useMemo(
    () => ({
      trigger_start: TriggerNode,
      trigger_command: TriggerNode,
      trigger_callback: TriggerNode,
      trigger_keyboard: TriggerNode,
      trigger_message: TriggerNode,
      action_send_message: MessageNode,
      action_edit_message: EditMessageNode,
      action_condition: ConditionNode,
      action_set_variable: ActionNode,
      action_loop: LoopNode,
      math: MathNode,
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

  // Context menu state: { x, y, type: 'pane'|'node'|'edge', id }
  const [contextMenu, setContextMenu] = useState(null);
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
        stroke = '#ef4444';
        strokeDasharray = '5 4';
        animated = false;
      } else if (dirty || edge.data?.unsaved) {
        stroke = 'var(--warning, #f59e0b)';
        strokeDasharray = '6 4';
        animated = true;
      } else {
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

  const isDark = theme === 'dark';

  // Right-click on empty pane -> open the add-node palette at cursor (App opens QuickSearchPalette)
  const handlePaneCtx = (e) => {
    e.preventDefault();
    const point = { x: e.clientX, y: e.clientY };
    if (onPaneContextMenu) onPaneContextMenu(point);
  };

  // Right-click on a node -> local menu with Add (new node at this spot) + Delete
  const handleNodeCtx = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', id: node.id });
  };

  // Right-click on an edge -> delete connection (or add)
  const handleEdgeCtx = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', id: edge.id });
  };

  const handleAddHereFromMenu = (ev) => {
    ev.stopPropagation();
    const pos = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
    onAddNodeAt?.(contextMenu.x, contextMenu.y, pos);
    setContextMenu(null);
  };

  const handleCloseMenu = () => setContextMenu(null);

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
        onlyRenderVisibleElements
        className={isDark ? 'dark-canvas' : 'light-canvas'}
        minZoom={0.2}
        maxZoom={2.5}
        onMoveStart={handleCloseMenu}
      >
        <Background
          color={isDark ? '#1e293b' : '#cbd5e1'}
          gap={20}
          size={2}
        />
        <Controls
          className={
            '!rounded-xl !shadow-lg !overflow-hidden ' +
            (isDark
              ? '!bg-[#0d1322] !border !border-[#1e293b]'
              : '!bg-white !border !border-gray-200')
          }
        />
        <MiniMap
          position="top-left"
          className={
            '!rounded-xl !shadow-lg !overflow-hidden ' +
            (isDark
              ? '!bg-[#0a0f1d] !border !border-[#1e293b]'
              : '!bg-white !border !border-gray-200')
          }
          nodeColor={() => (isDark ? '#334155' : '#cbd5e1')}
          maskColor={isDark ? 'rgba(6,9,19,0.8)' : 'rgba(255,255,255,0.85)'}
          style={{ zIndex: 5 }}
          pannable={false}
          zoomable={false}
        />
      </ReactFlow>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[60] bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[190px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'pane' && (
            <button
              onClick={handleAddHereFromMenu}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors"
            >
              <Plus size={14} className="text-accent" />
              <span>{t('canvas.add_node_here') || 'Add Node Here'}</span>
            </button>
          )}

          {contextMenu.type === 'node' && (
            <>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  onAddNodeAt?.(contextMenu.x, contextMenu.y);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors"
              >
                <Plus size={14} className="text-accent" />
                <span>{t('canvas.add_node_here') || 'Add Node Next'}</span>
              </button>
              <button
                onClick={() => {
                  onDeleteNode?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 size={14} />
                <span>{t('canvas.delete_node') || 'Delete Node'}</span>
              </button>
            </>
          )}

          {contextMenu.type === 'edge' && (
            <>
              <button
                onClick={handleAddHereFromMenu}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors"
              >
                <Plus size={14} className="text-accent" />
                <span>{t('canvas.add_node_here') || 'Add Node Here'}</span>
              </button>
              <button
                onClick={() => {
                  onDeleteEdge?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <Unlink size={14} />
                <span>{t('canvas.delete_connection') || 'Delete Connection'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}