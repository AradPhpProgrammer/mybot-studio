import React from 'react';
import KeyboardLayoutEditor from '../Nodes/KeyboardLayoutEditor';

/**
 * Backward-compatibility wrapper for legacy imports.
 * Routes directly to the unified shared KeyboardLayoutEditor.
 */
export default function KeyboardEditor({
  buttons = [],
  onChange,
  keyboardType = 'inline',
  knownIdentifiers = [],
  nodes = [],
  edges = [],
  nodeId = 'legacy-keyboard'
}) {
  return (
    <KeyboardLayoutEditor
      nodeId={nodeId}
      data={{ buttons, keyboard_type: keyboardType }}
      embedded
      knownIdentifiers={knownIdentifiers}
      nodes={nodes}
      edges={edges}
      onChange={next => onChange?.(next.buttons || [])}
    />
  );
}
