import React, { useState, useRef, useEffect, useMemo } from 'react';
import { reduceDeliveredReplyKeyboard } from './simulatorKeyboard.mjs';
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
  Terminal,
  Plus,
  Keyboard,
  Menu
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import RichTextToolbar from './RichTextToolbar';
import KeyboardLayoutEditor from '../Nodes/KeyboardLayoutEditor';
import { isKeyboardNode } from '../Nodes/keyboardGraph.mjs';
import { api } from '../../services/api';
import VariableTextArea, { HighlightedText } from '../Variables/VariableTextArea';
import { clampMockupPosition, getMockupSize } from './mockupWindow.mjs';

export default function TelegramMockup({
  currentBot,
  selectedNode,
  onUpdateNodeData,
  onFocusNode,
  nodes = [],
  edges = []
}) {
  const { t, dir } = useI18n();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'simulator'
  
  // Dragging state
  const [position, setPosition] = useState(() => clampMockupPosition({ x: window.innerWidth - 420, y: 80 }, window.innerWidth, window.innerHeight));
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
  const [lastChatAction, setLastChatAction] = useState(null);
  const [alertPopup, setAlertPopup] = useState(null);
  const [replyMenuOpen, setReplyMenuOpen] = useState(false);
  const [commandsMenuOpen, setCommandsMenuOpen] = useState(false);
  const [deliveredKeyboard, setDeliveredKeyboard] = useState({ source: null, buttons: [] });
  const chatBottomRef = useRef(null);

  // Extract all slash commands defined across flow trigger nodes (/start, /help, etc.)
  const flowCommands = useMemo(() => {
    const cmds = [];
    nodes.forEach((n) => {
      if (n?.type === 'trigger_start') {
        cmds.push({ command: '/start', description: t('mockup.start_description') });
      } else if (n?.type === 'trigger_command') {
        cmds.push({
          command: n.data?.command || '/cmd',
          description: n.data?.description || t('mockup.custom_command')
        });
      }
    });
    // Deduplicate by command name
    const seen = new Set();
    return cmds.filter((c) => {
      if (seen.has(c.command)) return false;
      seen.add(c.command);
      return true;
    });
  }, [nodes, t]);

  // Collect all callback identifiers defined across the flow so the keyboard
  // editor and button-triggers can suggest existing user-defined IDs (no hardcoding).
  const flowIdentifiers = useMemo(() => {
    const ids = new Set();
    nodes.forEach((n) => {
      const btns = n?.data?.buttons;
      if (Array.isArray(btns)) {
        btns.forEach((row) => {
          (row || []).forEach((b) => {
            if (b?.callback_data) ids.add(b.callback_data);
          });
        });
      }
      if (n?.data?.callback_data) ids.add(n.data.callback_data);
    });
    return Array.from(ids);
  }, [nodes]);

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
    const handleResize = () => setPosition(current => clampMockupPosition(current, window.innerWidth, window.innerHeight));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition(clampMockupPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      }, window.innerWidth, window.innerHeight));
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

  // Text Selection Ref for RichText toolbar wrapping
  const lastSelectionRef = useRef({ start: 0, end: 0 });

  // Rich Text Formatting: wraps ONLY the user's selected text with the HTML tag
  const handleApplyTag = (tag) => {
    if (!selectedNode || (selectedNode.type !== 'action_send_message' && selectedNode.type !== 'action_edit_message')) return;
    const currentText = selectedNode.data.text || '';
    const { start, end } = lastSelectionRef.current;
    const tagBase = tag.split(' ')[0];

    let updated;
    if (start !== end && end <= currentText.length) {
      // User selected a specific portion with mouse
      const before = currentText.slice(0, start);
      const selectedSlice = currentText.slice(start, end);
      const after = currentText.slice(end);
      updated = `${before}<${tag}>${selectedSlice}</${tagBase}>${after}`;
    } else {
      // No selection: append or wrap whole text
      updated = currentText ? `<${tag}>${currentText}</${tagBase}>` : `<${tag}>${t('mockup.sample_text')}</${tagBase}>`;
    }

    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: updated });
  };

  const handleInsertTable = () => {
    if (!selectedNode || (selectedNode.type !== 'action_send_message' && selectedNode.type !== 'action_edit_message')) return;
    const tableTemplate = t('mockup.table_template');

    const currentText = selectedNode.data.text || '';
    const updated = currentText ? `${currentText}\n\n${tableTemplate}` : tableTemplate;
    onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: updated });
  };

  // Handle clicking a reply keyboard button in the simulator: sends the button's
  // identifier (device/ID = text if no callback_data) as a user message with type 'message'.
  const sendReplyKeyboardPress = async (btn) => {
    setReplyMenuOpen(false);
    const identifier = btn.callback_data || btn.text || btn.id || 'Keyboard';
    await sendSimulatorMessage(identifier, 'message');
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
        first_name: 'Tester'
      });

      setIsTyping(false);

      if (res.alerts && res.alerts.length > 0) {
        setAlertPopup(res.alerts[0]);
        setTimeout(() => setAlertPopup(null), 3500);
      }

      if (Array.isArray(res.chat_actions) && res.chat_actions.length > 0) {
        setLastChatAction(res.chat_actions[res.chat_actions.length - 1]);
      }

      if (res.messages && res.messages.length > 0) {
        setDeliveredKeyboard(current => reduceDeliveredReplyKeyboard(current, res.messages));
        setSimMessages((prev) => {
          let updated = [...prev];
          for (const m of res.messages) {
            if (m.is_edit) {
              const lastBotIdx = updated.map((x) => x.sender).lastIndexOf('bot');
              if (lastBotIdx !== -1) {
                updated[lastBotIdx] = {
                  ...updated[lastBotIdx],
                  text: m.text !== undefined && m.text !== '' ? m.text : updated[lastBotIdx].text,
                  media_type: m.media_type || updated[lastBotIdx].media_type,
                  media_url: m.media_url || updated[lastBotIdx].media_url,
                  reply_markup: m.reply_markup !== undefined ? m.reply_markup : updated[lastBotIdx].reply_markup
                };
                continue;
              }
            }
            updated.push({
              id: Date.now() + Math.random(),
              sender: 'bot',
              text: m.text,
              media_type: m.media_type,
              media_url: m.media_url,
              reply_markup: m.reply_markup
            });
          }
          return updated;
        });
      }
    } catch (err) {
      setIsTyping(false);
      setSimMessages(prev => [
        ...prev,
        { id: Date.now(), sender: 'bot', text: `⚠️ ${t('common.error')}: ${err.message}` }
      ]);
    }
  };

  // Minimized Floating Bubble - always stay at bottom-right regardless of LTR/RTL
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        aria-label={t('mockup.title')}
        className="mockup-bubble fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        title={t('mockup.title')}
      >
        <MessageCircle size={26} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-surface" />
      </button>
    );
  }

  const isEditNode = selectedNode?.type === 'action_edit_message';
  const isMessageNode = selectedNode?.type === 'action_send_message' || isEditNode;
  const isConditionNode = selectedNode?.type === 'action_condition';

  // Keep drag bounds and rendered dimensions in sync on every resize.
  const mockupSize = getMockupSize(window.innerWidth, window.innerHeight);
  const mockupStyle = { left: `${position.x}px`, top: `${position.y}px`, width: `${mockupSize.width}px`, height: `${mockupSize.height}px` };

  return (
    <div
      style={mockupStyle}
      dir={dir}
      className="telegram-mockup fixed z-40 bg-surface border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="mockup-titlebar px-3.5 py-2.5 bg-surface-secondary border-b border-border flex items-center justify-between gap-2 shrink-0 cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Bot size={13} />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {currentBot ? `@${currentBot.username}` : t('mockup.title')}
            </div>
            <div className="text-[10px] text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{activeTab === 'edit' ? t('mockup.edit_mode') : t('mockup.test_mode')}</span>
            </div>
          </div>
        </div>

        {/* Tab & Window Controls */}
        <div className="flex items-center gap-1 no-drag shrink-0">
          <div className="flex bg-surface p-0.5 rounded-lg border border-border text-[11px]">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'edit' ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted hover:text-foreground'
              }`}
            >
              {t('mockup.edit_tab')}
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'simulator' ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted hover:text-foreground'
              }`}
            >
              {t('mockup.test_tab')}
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-surface-tertiary text-muted hover:text-foreground transition-colors"
            title={t('common.minimize')} aria-label={t('common.minimize')}
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
        <div data-graph-editor className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-4 no-drag bg-surface-tertiary">
          {isKeyboardNode(selectedNode) ? (
            <KeyboardLayoutEditor variant="compact" key={selectedNode.id} nodeId={selectedNode.id} data={selectedNode.data}
              nodes={nodes} edges={edges} knownIdentifiers={flowIdentifiers}
              onChange={data => onUpdateNodeData(selectedNode.id, data)} />
          ) : isMessageNode ? (
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
                  <option value="text">{t('mockup.media_types.text')}</option>
                  <option value="photo">{t('mockup.media_types.photo')}</option>
                  <option value="video">{t('mockup.media_types.video')}</option>
                  <option value="voice">{t('mockup.media_types.voice')}</option>
                  <option value="document">{t('mockup.media_types.document')}</option>
                </select>
              </div>

              {/* Rich Text Toolbar */}
              <div className="mockup-rich-toolbar"><RichTextToolbar onApplyTag={handleApplyTag} onInsertTable={handleInsertTable} /></div>

              {/* Text Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">{t('mockup.text_label')}:</label>
                <VariableTextArea
                  data-graph-editor
                  rows={4}
                  value={selectedNode.data.text || ''}
                  onChange={(v) => onUpdateNodeData(selectedNode.id, { ...selectedNode.data, text: v })}
                  onSelect={(e) => {
                    lastSelectionRef.current = {
                      start: e.target.selectionStart || 0,
                      end: e.target.selectionEnd || 0
                    };
                  }}
                  placeholder={t('mockup.type_message')}
                  className="w-full bg-surface-secondary border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent resize-none font-sans"
                />
              </div>

              {/* Telegram Preview Bubble */}
              <div className="p-3 rounded-xl bg-surface border border-border shadow-inner space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  {t('mockup.preview_label')}:
                </div>
                {selectedNode.data.text ? (
                  <div className="p-3 rounded-2xl rounded-br-xs bg-blue-600/15 border border-blue-500/30 text-xs leading-relaxed text-foreground">
                    <HighlightedText text={selectedNode.data.text} />
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl rounded-br-xs bg-surface-secondary/40 border border-border/60 text-xs text-muted italic">
                    {t('common.add')}...
                  </div>
                )}
              </div>

              {/* Compatibility only: new keyboards belong to dedicated nodes. Keep
                  existing embedded data editable if a graph has not been migrated. */}
              {Array.isArray(selectedNode.data.buttons) && selectedNode.data.buttons.some(row => row?.length) && (
                <KeyboardLayoutEditor variant="compact" key={selectedNode.id} nodeId={selectedNode.id} data={selectedNode.data}
                  nodes={nodes} edges={edges} embedded knownIdentifiers={flowIdentifiers}
                  onChange={data => onUpdateNodeData(selectedNode.id, data)} />
              )}
            </div>
          ) : isConditionNode ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{t('nodes.action_condition.name')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono">
                    {t('nodes.action_condition.category')}
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  {t('nodes.action_condition.desc')}
                </p>

                {/* Input A */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted">{t('inspector.logic_input_a')}:</label>
                  <input
                    data-graph-editor
                    type="text"
                    value={selectedNode.data.input_a ?? ''}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { ...selectedNode.data, input_a: e.target.value })
                    }
                    placeholder="$balance"
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
                  />
                </div>

                {/* Operator */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted">{t('inspector.operator')}:</label>
                  <select
                    value={selectedNode.data.operator || '>='}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { ...selectedNode.data, operator: e.target.value })
                    }
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 outline-none focus:border-accent cursor-pointer"
                  >
                    {['>=', '<=', '==', '!=', '>', '<', 'and', 'or'].map((o) => (
                      <option key={o} value={o}>
                        {o === 'and' ? t('inspector.operator_and') : o === 'or' ? t('inspector.operator_or') : o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input B */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted">{t('inspector.logic_input_b')}:</label>
                  <input
                    data-graph-editor
                    type="text"
                    value={selectedNode.data.input_b ?? ''}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { ...selectedNode.data, input_b: e.target.value })
                    }
                    placeholder="100"
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Condition Live Preview Box (Inside floating editor) */}
              <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border shadow-inner space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  {t('mockup.preview_label')}:
                </div>
                <div className="p-3 rounded-xl bg-surface border border-amber-500/30 text-center font-mono text-xs text-foreground shadow-xs">
                  <span className="text-purple-400 font-semibold">{selectedNode.data.input_a || 'A'}</span>{' '}
                  <span className="font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                    {selectedNode.data.operator || '>='}
                  </span>{' '}
                  <span className="text-emerald-400 font-semibold">{selectedNode.data.input_b || 'B'}</span>
                </div>
                <div className="text-[10px] text-muted text-center">
                  {t('nodes.action_condition.preview_hint')}
                </div>
              </div>
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
                    {msg.text && msg.text.trim() ? (
                      <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                    ) : msg.media_type && msg.media_type !== 'text' && msg.media_url ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-muted">[{t(`mockup.media_types.${msg.media_type}`)}]</span>
                        <img
                          src={msg.media_url}
                          alt={t('mockup.media_alt')}
                          className="max-h-40 rounded-xl object-cover"
                        />
                      </div>
                    ) : null}

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
                <span className="text-[11px] ms-1">
                  {lastChatAction === 'upload_photo'
                    ? (t('mockup.uploading_photo'))
                    : lastChatAction === 'upload_video'
                    ? (t('mockup.uploading_video'))
                    : lastChatAction === 'record_voice'
                    ? (t('mockup.recording_voice'))
                    : lastChatAction === 'upload_document'
                    ? (t('mockup.uploading_document'))
                    : (t('mockup.typing'))}
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {deliveredKeyboard.buttons.length > 0 && <div data-delivered-reply className="p-2 space-y-1 border-t border-border bg-surface-secondary">
            {deliveredKeyboard.buttons.map((row, r) => <div key={r} className="flex gap-1">
              {row.map((button, c) => <button key={c} type="button"
                className="flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-foreground"
                onClick={() => sendSimulatorMessage(button.text, 'message')}>{button.text}</button>)}
            </div>)}
          </div>}
          {/* Quick Command Suggestions */}
          <div className="px-3 py-1.5 bg-surface-secondary/40 border-t border-border flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => sendSimulatorMessage('/start', 'command')}
              className="px-2.5 py-0.5 rounded-full bg-surface border border-border text-foreground font-mono hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              /start
            </button>
            <button
              onClick={() => { setSimMessages([]); setDeliveredKeyboard({ source: null, buttons: [] }); }}
              className="px-2 py-0.5 rounded-full bg-surface border border-border text-muted hover:text-foreground flex items-center gap-1 ms-auto"
              title={t('mockup.clear_history')}
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
            className="p-2 bg-surface border-t border-border flex items-center gap-2 relative z-20"
          >
            {/* Blue Telegram Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCommandsMenuOpen(!commandsMenuOpen);
                  setReplyMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95"
                title={t('mockup.commands_menu')}
              >
                <Menu size={13} />
                <span>{t('mockup.menu')}</span>
              </button>

              {/* Telegram Commands Menu Popup */}
              {commandsMenuOpen && (
                <div className="absolute bottom-12 start-0 w-64 bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border flex items-center justify-between">
                    <span>{t('mockup.bot_commands')}</span>
                    <span className="text-blue-400 font-mono text-[9px]">{flowCommands.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {flowCommands.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCommandsMenuOpen(false);
                          sendSimulatorMessage(c.command, 'command');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-start hover:bg-surface-secondary text-foreground text-xs transition-colors"
                      >
                        <span className="font-mono text-blue-400 font-semibold">{c.command}</span>
                        <span className="text-[10px] text-muted truncate max-w-[120px]">{c.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              placeholder={t('mockup.type_message')}
              className="flex-1 min-w-0 bg-surface-secondary border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
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
