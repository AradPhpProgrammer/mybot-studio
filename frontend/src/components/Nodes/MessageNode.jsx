import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Send, Image, Video, Mic, FileText, Sparkles, MessageCircle } from 'lucide-react';

const MEDIA_ICONS = {
  text: Send,
  photo: Image,
  video: Video,
  voice: Mic,
  document: FileText
};

export default function MessageNode({ data, selected }) {
  const mediaType = data.media_type || 'text';
  const Icon = MEDIA_ICONS[mediaType] || Send;
  const buttons = data.buttons || [];

  return (
    <div
      className={`min-w-[260px] max-w-[320px] rounded-xl border bg-surface/95 backdrop-blur-md shadow-lg transition-all duration-200 ${
        selected ? 'border-accent ring-2 ring-accent/40 shadow-accent/10' : 'border-border hover:border-muted'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-surface transition-transform hover:scale-125"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/70 bg-surface-secondary/50 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
            <Icon size={15} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-500">Message / Media</div>
            <div className="text-xs font-semibold text-foreground capitalize">{mediaType} Message</div>
          </div>
        </div>
        {data.expandable_quote && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium">
            Expandable
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed bg-surface-tertiary/50 p-2 rounded-lg border border-border/40">
          {data.text || <span className="italic text-muted">بدون متن...</span>}
        </p>

        {/* Inline Buttons Preview */}
        {buttons.length > 0 && (
          <div className="space-y-1 pt-1">
            {buttons.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-1">
                {row.map((btn, bIdx) => {
                  let btnColor = 'bg-surface-secondary border-border text-foreground';
                  if (btn.style === 'primary') btnColor = 'bg-blue-600/20 border-blue-500/50 text-blue-400 font-semibold';
                  if (btn.style === 'success') btnColor = 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 font-semibold';
                  if (btn.style === 'danger') btnColor = 'bg-red-600/20 border-red-500/50 text-red-400 font-semibold';

                  return (
                    <div
                      key={bIdx}
                      className={`flex-1 text-center py-1 px-1.5 rounded text-[10px] border truncate shadow-xs ${btnColor}`}
                    >
                      {btn.text || 'دکمه'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-surface transition-transform hover:scale-125"
      />
    </div>
  );
}
