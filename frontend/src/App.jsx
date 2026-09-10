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
import Canvas from './components/Canvas/Canvas';
import QuickSearchPalette from './components/QuickSearch/QuickSearchPalette';
import TelegramMockup from './components/Mockup/TelegramMockup';
import PluginsModal from './components/Plugins/PluginsModal';

import { useI18n } from './locales/i18n';
import { useFont } from './fonts/FontContext';
import { api } from './services/api';

export default function App() {
  const { t } = useI18n();
  const [theme, setTheme] = useState(() => localStorage.getItem('mybot_theme') || 'dark');
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('mybot_token'));

  // Navigation state
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'studio'
  const [sidebarTab, setSidebarTab] = useState('profiles'); // 'profiles', 'plugins', 'settings'

  // Bot & Flow State
  const [bots, setBots] = useState([]);
  const [currentBot, setCurrentBot] = useState(null);
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
  const [updateInfo, setUpdateInfo] = useState(null);

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

  // Load Bots on mount or auth change
  const loadBots = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingBots(true);
      const list = await api.getBots();
      setBots(list);
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
    }
  }, [isAuthenticated, loadBots]);

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

  const handleSelectBot = (bot) => {
    setCurrentBot(bot);
    loadBotFlow(bot.id);
    setView('studio');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    loadBots();
  };

  const handleLogout = () => {
    localStorage.removeItem('mybot_token');
    setIsAuthenticated(false);
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
      alert('خطا در بارگذاری تمپلیت: ' + err.message);
    }
  };

  // Quick Search Add Node
  const handleAddNode = (def) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: def.type,
      position: { x: quickSearchPos.x || 300, y: quickSearchPos.y || 200 },
      data: { ...def.data }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setIsDirty(true);
  };

  // Keyboard Shortcuts (Ctrl+S for save, Space for quick search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFlow();
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
  }, [view, nodes, edges, currentBot]);

  const handlePaneContextMenu = (e) => {
    e.preventDefault();
    setQuickSearchPos({ x: e.clientX, y: e.clientY });
    setQuickSearchOpen(true);
  };

  const handleDeleteBot = async (botId) => {
    if (confirm('آیا از حذف این ربات اطمینان دارید؟ تمام جریان‌ها و کاربران آن حذف خواهند شد.')) {
      await api.deleteBot(botId);
      loadBots();
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
            />
          )}

          {sidebarTab === 'plugins' && <PluginsView />}

          {sidebarTab === 'settings' && <SettingsView />}

          {/* Right Sidebar (Profiles -> Plugins -> Settings) */}
          <Sidebar
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            onLogout={handleLogout}
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
            theme={theme}
          />

          {/* Floating Draggable Resizable Telegram Mockup & Live Simulator */}
          <TelegramMockup
            currentBot={currentBot}
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
          />

          {/* Quick Search Palette */}
          <QuickSearchPalette
            isOpen={quickSearchOpen}
            onClose={() => setQuickSearchOpen(false)}
            onSelectNode={handleAddNode}
            position={quickSearchPos}
          />

          {/* Plugins Modal */}
          <PluginsModal
            isOpen={pluginsModalOpen}
            onClose={() => setPluginsModalOpen(false)}
            currentBot={currentBot}
          />
        </div>
      )}
    </div>
  );
}
