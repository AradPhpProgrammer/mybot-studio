const API_BASE = '/api';

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid username or password');
    }
    return res.json();
  },
  async changeCredentials(currentPassword, newUsername, newPassword) {
    const res = await fetch(`${API_BASE}/auth/change-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_username: newUsername,
        new_password: newPassword
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update credentials');
    }
    return res.json();
  },

  // Bots
  async getBots() {
    const res = await fetch(`${API_BASE}/bots`);
    return res.json();
  },
  async createBot(token, customProxy = '', cfWorkerUrl = '') {
    const res = await fetch(`${API_BASE}/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, custom_proxy: customProxy, cf_worker_url: cfWorkerUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create bot');
    }
    return res.json();
  },
  async getBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`);
    return res.json();
  },
  async updateBotSettings(botId, settings) {
    const res = await fetch(`${API_BASE}/bots/${botId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },
  async deleteBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`, { method: 'DELETE' });
    return res.json();
  },
  async syncCommands(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/sync-commands`, { method: 'POST' });
    return res.json();
  },

  // Flows
  async getFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}`);
    if (!res.ok) return null;
    return res.json();
  },
  async saveFlow(botId, { name, nodes, edges, viewport }) {
    const res = await fetch(`${API_BASE}/flows/${botId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nodes, edges, viewport })
    });
    return res.json();
  },
  async getNodeCatalog() {
    const res = await fetch(`${API_BASE}/flows/catalog`);
    return res.json();
  },
  async exportFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}/export`);
    return res.json();
  },
  async importFlow(botId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/flows/${botId}/import`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  // Simulator
  async dispatchSimulator(botId, eventType, payload, userInfo = {}) {
    const res = await fetch(`${API_BASE}/simulator/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: botId,
        event_type: eventType,
        payload: payload,
        user_id: userInfo.id || 99999999,
        username: userInfo.username || 'tester',
        first_name: userInfo.first_name || 'Tester'
      })
    });
    return res.json();
  },

  // Plugins
  async getPlugins() {
    const res = await fetch(`${API_BASE}/plugins`);
    return res.json();
  },
  async togglePlugin(pluginKey, isActive) {
    const res = await fetch(`${API_BASE}/plugins/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin_key: pluginKey, is_active: isActive })
    });
    return res.json();
  },

  // Languages & Fonts
  async getLanguages() {
    const res = await fetch(`${API_BASE}/i18n/languages`);
    return res.json();
  },
  async uploadLanguage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/i18n/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Language upload failed');
    }
    return res.json();
  },
  async getFonts() {
    const res = await fetch(`${API_BASE}/fonts`);
    return res.json();
  },

  // System
  async getSystemInfo() {
    const res = await fetch(`${API_BASE}/system/info`);
    return res.json();
  },
  async checkUpdate() {
    const res = await fetch(`${API_BASE}/system/check-update`);
    return res.json();
  },
  async triggerUpdate() {
    const res = await fetch(`${API_BASE}/system/update`, { method: 'POST' });
    return res.json();
  },
  async getProxyConfig() {
    const res = await fetch(`${API_BASE}/system/proxy`);
    return res.json();
  },
  async saveProxyConfig(config) {
    const res = await fetch(`${API_BASE}/system/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },
  async testProxy(config) {
    const res = await fetch(`${API_BASE}/system/proxy/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  }
};
