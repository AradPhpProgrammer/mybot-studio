import React, { useMemo, useState, useEffect } from 'react';
import { cursorToFlowPosition } from '../../graphHistory.js';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import { Plus, Trash2, Unlink } from 'lucide-react';

import { collapsibleNode } from '../Nodes/CollapsibleNode';
import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';
import MathNode from '../Nodes/MathNode';
import LoopNode from '../Nodes/LoopNode';
import EditMessageNode from '../Nodes/EditMessageNode';
import KeyboardNode from '../Nodes/KeyboardNode';
import { styleGraphEdges } from '../Nodes/keyboardGraph.mjs';
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
  onInit,
  onNodeDragStart,
  onNodeDragStop,
  onSelectionDragStart,
  onSelectionDragStop,
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
      trigger_start: collapsibleNode(TriggerNode),
      trigger_command: collapsibleNode(TriggerNode),
      trigger_callback: collapsibleNode(TriggerNode),
      trigger_keyboard: collapsibleNode(TriggerNode),
      trigger_message: collapsibleNode(TriggerNode),
      action_send_message: collapsibleNode(MessageNode),
      action_edit_message: collapsibleNode(EditMessageNode),
      action_keyboard: collapsibleNode(KeyboardNode),
      action_reply_keyboard: collapsibleNode(KeyboardNode),
      action_condition: collapsibleNode(ConditionNode),
      action_set_variable: collapsibleNode(ActionNode),
      action_loop: collapsibleNode(LoopNode),
      math: collapsibleNode(MathNode),
      math_add: collapsibleNode(MathNode),
      math_subtract: collapsibleNode(MathNode),
      math_multiply: collapsibleNode(MathNode),
      math_divide: collapsibleNode(MathNode),
      action_delay: collapsibleNode(ActionNode),
      action_http_request: collapsibleNode(ActionNode),
      action_answer_callback: collapsibleNode(ActionNode)
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

  // Validation overrides persisted edge styles; it never mutates graph history.
  const styledEdges = useMemo(() => styleGraphEdges(nodes, edges, dirty), [nodes, edges, dirty]);

  const isDark = theme === 'dark';

  // Right-click on empty pane -> open the add-node palette at cursor (App opens QuickSearchPalette)
  const handlePaneCtx = (e) => {
    e.preventDefault();
    const point = { x: e.clientX, y: e.clientY };
    setContextMenu(null);
    if (onPaneContextMenu) onPaneContextMenu(point, cursorToFlowPosition(screenToFlowPosition, point));
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
    const pos = cursorToFlowPosition(screenToFlowPosition, contextMenu);
    onAddNodeAt?.(contextMenu.x, contextMenu.y, pos);
    setContextMenu(null);
  };

  const handleCloseMenu = () => setContextMenu(null);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={onSelectionDragStart}
        onSelectionDragStop={onSelectionDragStop}
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
          color="var(--border)"
          style={{ backgroundColor: 'var(--surface-secondary)' }}
          gap={20}
          size={2}
        />
        {onAddNodeAt && <Panel position="top-right" className="canvas-touch-add !top-20">
          <button
            type="button"
            aria-label={t('canvas.add_node_here')}
            title={t('canvas.add_node_here')}
            onClick={(event) => {
              const rect = event.currentTarget.closest('.react-flow').getBoundingClientRect();
              const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
              onAddNodeAt(point.x, point.y, cursorToFlowPosition(screenToFlowPosition, point));
            }}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-lg hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </Panel>}
        <Controls
          className={
            '!rounded-xl !shadow-lg !overflow-hidden ' +
            (isDark
              ? '!bg-[#0d1322] !border !border-[#1e293b]'
              : '!bg-surface-secondary !border !border-border')
          }
        />
        <MiniMap
          position="top-left"
          className={
            '!rounded-xl !shadow-lg !overflow-hidden ' +
            (isDark
              ? '!bg-[#0a0f1d] !border !border-[#1e293b]'
              : '!bg-surface-secondary !border !border-border')
          }
          nodeColor={() => (isDark ? '#334155' : '#cbd5e1')}
          maskColor="color-mix(in srgb, var(--surface-tertiary) 85%, transparent)"
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
              <span>{t('canvas.add_node_here')}</span>
            </button>
          )}

          {contextMenu.type === 'node' && (
            <>
              <button
                onClick={handleAddHereFromMenu}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-surface-secondary transition-colors"
              >
                <Plus size={14} className="text-accent" />
                <span>{t('canvas.add_node_here')}</span>
              </button>
              <button
                onClick={() => {
                  onDeleteNode?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 size={14} />
                <span>{t('canvas.delete_node')}</span>
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
                <span>{t('canvas.add_node_here')}</span>
              </button>
              <button
                onClick={() => {
                  onDeleteEdge?.(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <Unlink size={14} />
                <span>{t('canvas.delete_connection')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}