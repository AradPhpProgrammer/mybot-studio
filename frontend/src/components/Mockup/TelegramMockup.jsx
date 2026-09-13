import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2, 
  Sparkles, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  X,
  MessageCircle,
  Move,
  Layers,
  Terminal
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import RichTextToolbar from './RichTextToolbar';
import KeyboardEditor from './KeyboardEditor';
import { api } from '../../services/api';

export default function TelegramMockup({
  currentBot,
  selectedNode,
  onUpdateNodeData,
  onFocusNode
}) {
  const { t, dir } = useI18n();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'simulator'
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Simulator chat history
  const [simMessages, setSimMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: t('mockup.welcome_msg'),
      reply_markup: {
        inline_keyboard: [
          [{ text: t('mockup.start_btn'), callback_data: '/start', style: 'primary' }]
        ]
      }
    }
  ]);
  const [simInput, setSimInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [alertPopup, setAlertPopup] = useState(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages, isTyping]);

  // Handle Dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 400, e.clientX - dragStartRef.current.x)),
        y: Math.max(60, Math.min(window.innerHeight - 300, e.clientY - dragStartRef.current.y))
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Rich Text Formatting
  const handleApplyTag = (tag) => {
    if (!selectedNode || selectedNode.type !== 'action_send_message') return;
    const currentText = selectedNode.data.text || '';
    const updated = `<${tag}>${currentText}</${tag.split(' ')[0]}>`;
    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: updated });
  };

  const handleInsertTable = () => {
    if (!selectedNode || selectedNode.type !== 'action_send_message') return;
    const tableStr = `<pre>
┌────────┬────────┐
│ آیتم   │ قیمت   │
├────────┼────────┤
│ پلن A  │ 10,000 │
│ پلن B  │ 20,000 │
└────────┴────────┘
</pre>`;
    const currentText = selectedNode.data.text || '';
    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: currentText + '\n' + tableStr });
  };

  // Dispatch Simulator Event
  const sendSimulatorMessage = async (payload, eventType = 'message') => {
    if (!currentBot) return;

    // Add user message to log if it's text/command
    if (eventType !== 'callback') {
      setSimMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: payload }]);
      setSimInput('');
    }

    setIsTyping(true);
    try {
      const res = await api.dispatchSimulator(currentBot.id, eventType, payload, {
        id: 99999999,
        username: 'tester',
        first_name: 'تستر'
      });

      setIsTyping(false);

      if (res.alerts && res.alerts.length > 0) {
        setAlertPopup(res.alerts[0]);
        setTimeout(() => setAlertPopup(null), 3500);
      }

      if (res.messages && res.messages.length > 0) {
        const newBotMsgs = res.messages.map((m, idx) => ({
          id: Date.now() + idx + 1,
          sender: 'bot',
          text: m.text,
          media_type: m.media_type,
          media_url: m.media_url,
          reply_markup: m.reply_markup
        }));
        setSimMessages(prev => [...prev, ...newBotMsgs]);
      }
    } catch (err) {
      setIsTyping(false);
      setSimMessages(prev => [
        ...prev,
        { id: Date.now(), sender: 'bot', text: `⚠️ خطا در شبیه‌ساز: ${err.message}` }
      ]);
    }
  };

  // Minimized Floating Bubble
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 end-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        title={t('mockup.title')}
      >
        <MessageCircle size={26} />
        <span className="absolute -top-1 -end-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-surface animate-ping" />
      </button>
    );
  }

  const isMessageNode = selectedNode?.type === 'action_send_message';

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-40 w-[380px] max-w-[95vw] h-[600px] max-h-[85vh] bg-surface border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3.5 py-2.5 bg-surface-secondary/80 border-b border-border flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Bot size={13} />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {currentBot ? `@${currentBot.username}` : 'Telegram Mockup'}
            </div>
            <div className="text-[10px] text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{activeTab === 'edit' ? t('mockup.edit_mode') : t('mockup.test_mode')}</span>
            </div>
          </div>
        </div>

        {/* Tab & Window Controls */}
        <div className="flex items-center gap-1 no-drag">
          <div className="flex bg-surface p-0.5 rounded-lg border border-border text-[11px]">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'edit' ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted hover:text-foreground'
              }`}
            >
              ویرایش
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'simulator' ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted hover:text-foreground'
              }`}
            >
              تست چت
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-surface-tertiary text-muted hover:text-foreground transition-colors"
            title="Minimize"
          >
            <Minimize2 size={13} />
          </button>
        </div>
      </div>

      {/* Telegram Alert Toast */}
      {alertPopup && (
        <div className="absolute top-14 left-4 right-4 z-50 bg-accent text-accent-foreground p-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>{alertPopup}</span>
          <button onClick={() => setAlertPopup(null)} className="p-0.5 opacity-70 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      {/* TAB 1: VISUAL EDIT MODE */}
      {activeTab === 'edit' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-drag bg-background/50">
          {isMessageNode ? (
            <div className="space-y-3">
              {/* Media Type Switch */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{t('inspector.media_type')}:</span>
                <select
                  value={selectedNode.data.media_type || 'text'}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, media_type: e.target.value })
                  }
                  className="bg-surface-secondary px-2 py-1 rounded-lg text-xs text-foreground border border-border outline-none"
                >
                  <option value="text">📝 متن (Text)</option>
                  <option value="photo">🖼 عکس (Photo)</option>
                  <option value="video">🎬 ویدیو (Video)</option>
                  <option value="voice">🎙 ویس (Voice)</option>
                  <option value="document">📁 فایل (Document)</option>
                </select>
              </div>

              {/* Rich Text Toolbar */}
              <RichTextToolbar onApplyTag={handleApplyTag} onInsertTable={handleInsertTable} />

              {/* Text Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">{t('mockup.text_label')}:</label>
                <textarea
                  rows={4}
                  value={selectedNode.data.text || ''}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: e.target.value })
                  }
                  placeholder={t('mockup.type_message')}
                  className="w-full bg-surface-secondary border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent resize-none font-sans"
                />
              </div>

              {/* Telegram Preview Bubble */}
              <div className="p-3 rounded-xl bg-surface border border-border shadow-inner space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  {t('mockup.preview_label')}:
                </div>
                <div className="p-3 rounded-2xl rounded-br-xs bg-blue-600/15 border border-blue-500/30 text-xs leading-relaxed text-foreground">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedNode.data.text || '<span class="text-muted">بدون متن...</span>'
                    }}
                  />
                </div>
              </div>

              {/* Keyboard Editor */}
              <KeyboardEditor
                buttons={selectedNode.data.buttons || []}
                onChange={(newButtons) =>
                  onUpdateNodeData(selectedNode.id, { ...selectedNode.data, buttons: newButtons })
                }
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted space-y-2">
              <Layers size={32} className="opacity-40" />
              <div className="text-xs font-semibold text-foreground">{t('mockup.no_node_selected')}</div>
              <p className="text-[11px] leading-relaxed">
                {t('mockup.no_node_selected_desc')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE SIMULATOR CHAT */}
      {activeTab === 'simulator' && (
        <div className="flex-1 flex flex-col overflow-hidden no-drag bg-background/60">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {simMessages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isBot
                        ? 'bg-surface border border-border text-foreground rounded-bl-xs'
                        : 'bg-accent text-accent-foreground rounded-br-xs font-medium'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />

                    {/* Inline Buttons inside Simulated Message */}
                    {msg.reply_markup?.inline_keyboard && (
                      <div className="mt-2 space-y-1">
                        {msg.reply_markup.inline_keyboard.map((row, rIdx) => (
                          <div key={rIdx} className="flex gap-1">
                            {row.map((btn, bIdx) => {
                              let btnClass = 'bg-surface-secondary border-border text-foreground';
                              if (btn.style === 'primary') btnClass = 'bg-blue-600/25 border-blue-500/60 text-blue-400 font-semibold';
                              if (btn.style === 'success') btnClass = 'bg-emerald-600/25 border-emerald-500/60 text-emerald-400 font-semibold';
                              if (btn.style === 'danger') btnClass = 'bg-red-600/25 border-red-500/60 text-red-400 font-semibold';

                              return (
                                <button
                                  key={bIdx}
                                  onClick={() => sendSimulatorMessage(btn.callback_data, 'callback')}
                                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] border text-center transition-transform active:scale-95 shadow-xs truncate ${btnClass}`}
                                >
                                  {btn.text}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-muted p-2 bg-surface rounded-xl w-fit border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] ms-1">{t('mockup.typing')}</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Command Suggestions */}
          <div className="px-3 py-1.5 bg-surface-secondary/40 border-t border-border flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => sendSimulatorMessage('/start', 'command')}
              className="px-2.5 py-0.5 rounded-full bg-surface border border-border text-foreground font-mono hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              /start
            </button>
            <button
              onClick={() => setSimMessages([])}
              className="px-2 py-0.5 rounded-full bg-surface border border-border text-muted hover:text-foreground flex items-center gap-1 ms-auto"
              title="پاک کردن تاریخچه چت"
            >
              <RotateCcw size={10} />
              <span>{t('mockup.clear_chat')}</span>
            </button>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (simInput.trim()) {
                const isCmd = simInput.trim().startsWith('/');
                sendSimulatorMessage(simInput.trim(), isCmd ? 'command' : 'message');
              }
            }}
            className="p-2 bg-surface border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              placeholder={t('mockup.type_message')}
              className="flex-1 bg-surface-secondary border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!simInput.trim()}
              className="p-2 rounded-xl bg-accent text-accent-foreground disabled:opacity-40 transition-opacity"
            >
              <Send size={13} className={dir === 'rtl' ? 'rotate-180' : ''} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
