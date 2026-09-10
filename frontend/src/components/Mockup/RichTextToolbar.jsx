import React from 'react';
import { Bold, Italic, Underline, Strikethrough, EyeOff, Quote, Code, Table as TableIcon } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function RichTextToolbar({ onApplyTag, onInsertTable }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 p-1 bg-surface-secondary/80 border border-border rounded-lg shadow-xs">
      <button
        type="button"
        onClick={() => onApplyTag('b')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.bold')}
      >
        <Bold size={13} />
      </button>

      <button
        type="button"
        onClick={() => onApplyTag('i')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.italic')}
      >
        <Italic size={13} />
      </button>

      <button
        type="button"
        onClick={() => onApplyTag('u')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title="Underline"
      >
        <Underline size={13} />
      </button>

      <button
        type="button"
        onClick={() => onApplyTag('s')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title="Strikethrough"
      >
        <Strikethrough size={13} />
      </button>

      <div className="w-px h-3.5 bg-border mx-0.5" />

      <button
        type="button"
        onClick={() => onApplyTag('tg-spoiler')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.spoiler')}
      >
        <EyeOff size={13} />
      </button>

      <button
        type="button"
        onClick={() => onApplyTag('blockquote expandable')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.quote')}
      >
        <Quote size={13} />
      </button>

      <button
        type="button"
        onClick={() => onApplyTag('code')}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.code')}
      >
        <Code size={13} />
      </button>

      <button
        type="button"
        onClick={onInsertTable}
        className="p-1.5 rounded hover:bg-surface-tertiary text-foreground/80 hover:text-foreground transition-colors"
        title={t('mockup.rich_toolbar.table')}
      >
        <TableIcon size={13} />
      </button>
    </div>
  );
}
