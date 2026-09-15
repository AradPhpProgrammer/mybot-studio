import React, { useState, useEffect, useCallback } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useNodesState,
  useEdgesState
} from '@xyflow/react';

import LoginPage from './components/Auth/LoginPage';
import Sidebar from './components/Sidebar/Sidebar';
import SettingsView from './components/Settings/SettingsView';
import PluginsView from './components/Plugins/PluginsView';
import BotsList from './components/Dashboard/BotsList';
import Navbar from './components/Header/Navbar';
import BotSettingsModal from './components/Header/BotSettingsModal';
import Canvas from './components/Canvas/Canvas';
import QuickSearchPalette from './components/QuickSearch/QuickSearchPalette';
import TelegramMockup from './components/Mockup/TelegramMockup';
import PluginsModal from './components/Plugins/PluginsModal';

import { useI18n } from './locales/i18n';
import { api } from './services/api';

export default function App() {
  const { t } = useI18n();
  const [theme, setTheme] = useState(() => localStorage.getItem('mybot_theme') || 'dark');
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('mybot_token'));

  // Navigation state (persisted across refreshes)
  const [view, setView] = useState(() => localStorage.getItem('mybot_view') || 'dashboard');
  const [sidebarTab, setSidebarTab] = useState('profiles'); // 'profiles', 'plugins', 'settings'

  // Bot & Flow State (persisted across refreshes)
  const [bots, setBots] = useState([]);
  const [currentBot, setCurrentBot] = useState(() => {
    try {
      const raw = localStorage.getItem('mybot_current_bot');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loadingBots, setLoadingBots] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Overlays
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchPos, setQuickSearchPos] = useState({ x: 200, y: 200 });
  const [pluginsModalOpen, setPluginsModalOpen] = useState(false);
  const [botSettingsOpen, setBotSettingsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingNodePos, setPendingNodePos] = useState(null);

  // Theme application
  useEffect(() => {
    localStorage.setItem('mybot_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Load Bot Flow
  const loadBotFlow = useCallback(async (botId) => {
    try {
      const flow = await api.getFlow(botId);
      if (flow) {
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        setIsDirty(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [setNodes, setEdges]);

  // Load Bots on mount or auth change
  const loadBots = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingBots(true);
      const list = await api.getBots();
      setBots(list);

      // Verify and sync currentBot from freshly loaded list
      const savedBotId = localStorage.getItem('mybot_current_bot_id');
      const savedView = localStorage.getItem('mybot_view');
      if (savedView === 'studio' && savedBotId) {
        const found = list.find((b) => String(b.id) === String(savedBotId));
        if (found) {
          setCurrentBot(found);
          localStorage.setItem('mybot_current_bot', JSON.stringify(found));
        } else if (list.length > 0) {
          // If stored bot ID was deleted, gracefully return to dashboard
          setView('dashboard');
          setCurrentBot(null);
          localStorage.setItem('mybot_view', 'dashboard');
          localStorage.removeItem('mybot_current_bot');
          localStorage.removeItem('mybot_current_bot_id');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBots(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBots();
      api.checkUpdate().then(setUpdateInfo).catch(() => {});
      
      // If we were in studio view before refresh, immediately load flow for saved bot
      const savedBotId = localStorage.getItem('mybot_current_bot_id');
      const savedView = localStorage.getItem('mybot_view');
      if (savedView === 'studio' && savedBotId) {
        loadBotFlow(savedBotId);
      }
    }
  }, [isAuthenticated, loadBots, loadBotFlow]);

  const handleSelectBot = (bot) => {
    setCurrentBot(bot);
    localStorage.setItem('mybot_current_bot', JSON.stringify(bot));
    localStorage.setItem('mybot_current_bot_id', String(bot.id));
    localStorage.setItem('mybot_view', 'studio');
    loadBotFlow(bot.id);
    setView('studio');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentBot(null);
    localStorage.setItem('mybot_view', 'dashboard');
    localStorage.removeItem('mybot_current_bot');
    localStorage.removeItem('mybot_current_bot_id');
    loadBots();
  };

  const handleLogout = () => {
    localStorage.removeItem('mybot_token');
    localStorage.removeItem('mybot_view');
    localStorage.removeItem('mybot_current_bot');
    localStorage.removeItem('mybot_current_bot_id');
    setIsAuthenticated(false);
  };

  const handleUpdateBot = (updatedBot) => {
    setCurrentBot(updatedBot);
    localStorage.setItem('mybot_current_bot', JSON.stringify(updatedBot));
    setBots((prev) => prev.map((b) => (b.id === updatedBot.id ? updatedBot : b)));
  };

  const handleToggleRunBot = async () => {
    if (!currentBot) return;
    try {
      const res = await api.toggleBotActive(currentBot.id);
      const updated = { ...currentBot, is_active: res.is_active };
      handleUpdateBot(updated);
    } catch (e) {
      console.error('Error toggling bot run status:', e);
    }
  };

  // Node & Edge Handlers
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setIsDirty(true);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setIsDirty(true);
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const handleUpdateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data: newData } : prev));
    setIsDirty(true);
  };

  // Save Flow
  const handleSaveFlow = async () => {
    if (!currentBot) return;
    setIsSaving(true);
    try {
      await api.saveFlow(currentBot.id, {
        name: 'Main Flow',
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 }
      });
      await api.syncCommands(currentBot.id);
      setIsDirty(false);
    } catch (e) {
      console.error('Error saving flow:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Export / Import
  const handleExportFlow = async () => {
    if (!currentBot) return;
    try {
      const data = await api.exportFlow(currentBot.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mybot-${currentBot.username}-flow.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportFlow = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentBot) return;
    try {
      await api.importFlow(currentBot.id, file);
      loadBotFlow(currentBot.id);
    } catch (err) {
      alert(t('common.template_error', { error: err.message }) || `Error importing flow: ${err.message}`);
    }
  };

  // Quick Search Add Node
  const handleAddNode = (def, pos) => {
    const position = pos || pendingNodePos || { x: quickSearchPos.x || 300, y: quickSearchPos.y || 200 };
    const newNode = {
      id: `node_${Date.now()}`,
      type: def.type,
      position,
      data: { ...def.data }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setPendingNodePos(null);
    setIsDirty(true);
  };

  // Add node at specific flow position (right-click)
  const handleAddNodeAt = (clientX, clientY, flowPos) => {
    setQuickSearchPos({ x: clientX, y: clientY });
    setPendingNodePos(flowPos || null);
    setQuickSearchOpen(true);
  };

  // Delete node and its connected edges
  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
    setIsDirty(true);
  };

  // Delete a single edge
  const handleDeleteEdge = (edgeId) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setIsDirty(true);
  };

  // Prevent closing / reloading if there are unsaved flow changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved flow changes.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard Shortcuts (Ctrl+S for save, Ctrl+Shift+N for quick search, Ctrl+Z/Y for undo/redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFlow();
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        if (view === 'studio') {
          e.preventDefault();
          setQuickSearchPos({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 });
          setQuickSearchOpen(true);
        }
      } else if (
        e.code === 'Space' && 
        view === 'studio' && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setQuickSearchPos({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 });
        setQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, nodes, edges, currentBot, isDirty]);

  const handlePaneContextMenu = (e) => {
    // e may be either a native event or a plain {x,y} point from Canvas
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const x = typeof e === 'object' && 'clientX' in e ? e.clientX : (e?.x ?? window.innerWidth / 2);
    const y = typeof e === 'object' && 'clientY' in e ? e.clientY : (e?.y ?? window.innerHeight / 2);
    setQuickSearchPos({ x, y });
    setQuickSearchOpen(true);
  };

  const handleDeleteBot = async (botId) => {
    const confirmMsg = t('common.confirm_delete_bot') || 'Are you sure you want to delete this bot? All its flows and user data will be deleted.';
    if (window.confirm(confirmMsg)) {
      await api.deleteBot(botId);
      if (currentBot?.id === botId) {
        handleBackToDashboard();
      } else {
        loadBots();
      }
    }
  };

  const handleRefreshBot = async (bot) => {
    try {
      await api.refreshBotInfo(bot.id);
      await loadBots();
    } catch (e) {
      window.alert(e.message || 'Failed to refresh bot info');
    }
  };

  const handleUploadAvatar = async (bot, file) => {
    try {
      const res = await api.uploadBotAvatar(bot.id, file);
      await loadBots();
      return res;
    } catch (e) {
      window.alert(e.message || 'Failed to upload photo');
      throw e;
    }
  };

  // 1. Not Logged In -> Show Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // 2. Logged In -> Dashboard or Studio
  return (
    <div className="w-screen h-screen overflow-hidden bg-background text-foreground font-sans flex">
      {view === 'dashboard' ? (
        <>
          {/* Main Content Area */}
          {sidebarTab === 'profiles' && (
            <BotsList
              bots={bots}
              onSelectBot={handleSelectBot}
              onBotCreated={loadBots}
              onDeleteBot={handleDeleteBot}
              onRefreshBot={handleRefreshBot}
              onUploadAvatar={handleUploadAvatar}
            />
          )}

          {sidebarTab === 'plugins' && <PluginsView />}

          {sidebarTab === 'settings' && <SettingsView currentTheme={theme} onThemeChange={setTheme} />}

          {/* Right Sidebar (Profiles -> Plugins -> Settings) */}
          <Sidebar
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            onLogout={handleLogout}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </>
      ) : (
        /* Full Visual Studio Canvas */
        <div className="w-full h-full relative">
          {/* Top Auto-Hide Navbar */}
          <Navbar
            currentBot={currentBot}
            allBots={bots}
            onSelectBot={handleSelectBot}
            onBackToDashboard={handleBackToDashboard}
            onSaveFlow={handleSaveFlow}
            isDirty={isDirty}
            isSaving={isSaving}
            onExportFlow={handleExportFlow}
            onImportFlow={handleImportFlow}
            onOpenPlugins={() => setPluginsModalOpen(true)}
            onOpenBotSettings={() => setBotSettingsOpen(true)}
            onToggleRunBot={handleToggleRunBot}
            updateInfo={updateInfo}
            theme={theme}
            setTheme={setTheme}
          />

          {/* Infinite DAG Canvas */}
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneContextMenu={handlePaneContextMenu}
            onAddNodeAt={handleAddNodeAt}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            theme={theme}
            dirty={isDirty}
          />

          {/* Floating Draggable Resizable Telegram Mockup & Live Simulator */}
          <TelegramMockup
            currentBot={currentBot}
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
            nodes={nodes}
          />

          {/* Quick Search Palette */}
          <QuickSearchPalette
            isOpen={quickSearchOpen}
            onClose={() => setQuickSearchOpen(false)}
            onSelectNode={handleAddNode}
            position={quickSearchPos}
            currentBot={currentBot}
          />

          {/* Plugins Modal */}
          <PluginsModal
            isOpen={pluginsModalOpen}
            onClose={() => setPluginsModalOpen(false)}
            currentBot={currentBot}
          />

          {/* Bot Settings Modal */}
          <BotSettingsModal
            isOpen={botSettingsOpen}
            onClose={() => setBotSettingsOpen(false)}
            bot={currentBot}
            onBotUpdated={handleUpdateBot}
            onExportFlow={handleExportFlow}
            onImportFlow={handleImportFlow}
          />
        </div>
      )}
    </div>
  );
}
