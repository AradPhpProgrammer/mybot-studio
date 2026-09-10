import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap
} from '@xyflow/react';

import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';
import MathNode from '../Nodes/MathNode';

export default function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneContextMenu,
  theme
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

  // Custom edge style for crisp n8n wires
  const defaultEdgeOptions = useMemo(() => ({
    animated: true,
    style: { stroke: 'var(--accent, #3b82f6)', strokeWidth: 2.5 }
  }), []);

  return (
    <div className="w-full h-full relative" onContextMenu={onPaneContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable={true}
        nodesFocusable={true}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className={theme === 'dark' ? 'dark-canvas' : 'light-canvas'}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background 
          color={theme === 'dark' ? '#26334a' : '#cbd5e1'} 
          gap={18} 
          size={2} 
        />
        <Controls 
          className="!bg-surface !border-border !rounded-xl !shadow-lg !overflow-hidden [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-foreground"
        />
        <MiniMap 
          className="!bg-surface/90 !border-border !rounded-xl !shadow-lg !overflow-hidden"
          nodeColor={() => (theme === 'dark' ? '#334155' : '#cbd5e1')}
          maskColor={theme === 'dark' ? 'rgba(10,15,24,0.75)' : 'rgba(255,255,255,0.75)'}
        />
      </ReactFlow>
    </div>
  );
}
