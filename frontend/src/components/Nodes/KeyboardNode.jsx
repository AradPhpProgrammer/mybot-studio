import React from 'react';
import { Handle, Position, useReactFlow, useEdges, useNodes } from '@xyflow/react';
import KeyboardLayoutEditor from './KeyboardLayoutEditor';

export default function KeyboardNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeId = id || data?.id;
  return <div className={`w-[400px] rounded-2xl border shadow-lg transition-colors duration-150 motion-reduce:transition-none ${selected ? 'border-accent ring-2 ring-focus' : 'border-border'}`}>
    <Handle type="target" position={Position.Left} id="exec" className="!w-3 !h-3 !bg-accent !border-2 !border-surface" />
    <KeyboardLayoutEditor key={nodeId} nodeId={nodeId} data={data} nodes={nodes} edges={edges}
      onChange={nextData => setNodes(items => items.map(node => node.id === nodeId ? { ...node, data: nextData } : node))} />
    <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-accent !border-2 !border-surface" />
  </div>;
}
