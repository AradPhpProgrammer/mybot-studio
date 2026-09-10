import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState
} from '@xyflow/react';

import TriggerNode from '../Nodes/TriggerNode';
import MessageNode from '../Nodes/MessageNode';
import ConditionNode from '../Nodes/ConditionNode';
import ActionNode from '../Nodes/ActionNode';

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
    action_delay: ActionNode,
    action_http_request: ActionNode,
    action_answer_callback: ActionNode
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
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-background"
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background 
          color={theme === 'dark' ? '#333333' : '#e0e0e0'} 
          gap={20} 
          size={1.5} 
        />
        <Controls 
          className="!bg-surface !border-border !rounded-xl !shadow-lg !overflow-hidden [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-foreground"
        />
        <MiniMap 
          className="!bg-surface/90 !border-border !rounded-xl !shadow-lg !overflow-hidden"
          nodeColor={() => (theme === 'dark' ? '#444' : '#ccc')}
          maskColor={theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
        />
      </ReactFlow>
    </div>
  );
}
