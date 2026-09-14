// Smart error handling for API calls — catches HTML responses (SPA fallback) 
// and surfaces actionable debug info to the user.
async function _jsonOrDie(res, fallbackMsg) {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (!ct.includes('json')) {
      // Server returned HTML instead of JSON — likely SPA fallback or server down
      const text = await res.text().catch(() => '');
      throw new Error(
        'Server returned HTML instead of JSON.\n\n' +
        'Possible causes:\n' +
        '• Backend is not running — start it with: python -m app.main (in backend/)\n' +
        '• Frontend dev server proxy misconfigured — check vite.config.js\n' +
        '• Docker/nginx deployment issue — verify /api/ route reaches the backend\n' +
        `• Status code: ${res.status}`
      );
    }
    try {
      const err = await res.json();
      throw new Error(err.detail || fallbackMsg);
    } catch {
      throw new Error(fallbackMsg || `Request failed with status ${res.status}`);
    }
  }
  if (!ct.includes('json')) {
    const text = await res.text().catch(() => '');
    throw new Error(
      'Expected JSON but received HTML — the server may be down or misconfigured.\n\n' +
      'Check that the backend is running on port 8000 and the nginx proxy is correct.\n' +
      `Content-Type: ${ct}\nResponse preview: ${text.slice(0, 200)}`
    );
  }
  return res.json();
}

const API_BASE = '/api';

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return _jsonOrDie(res, 'Invalid username or password');
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
    return _jsonOrDie(res, 'Failed to update credentials');
  },

  // Bots
  async getBots() {
    const res = await fetch(`${API_BASE}/bots`);
    return _jsonOrDie(res, 'Failed to load bots');
  },
  async createBot(token, customProxy = '', cfWorkerUrl = '') {
    const res = await fetch(`${API_BASE}/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, custom_proxy: customProxy, cf_worker_url: cfWorkerUrl })
    });
    return _jsonOrDie(res, 'Failed to create bot');
  },
  async getBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`);
    return _jsonOrDie(res, 'Failed to load bot');
  },
  async updateBotSettings(botId, settings) {
    const res = await fetch(`${API_BASE}/bots/${botId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return _jsonOrDie(res, 'Failed to update bot settings');
  },
  async toggleBotActive(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/toggle-active`, {
      method: 'POST'
    });
    return _jsonOrDie(res, 'Failed to toggle bot');
  },
  async deleteBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`, { method: 'DELETE' });
    return _jsonOrDie(res, 'Failed to delete bot');
  },
  async syncCommands(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/sync-commands`, { method: 'POST' });
    return _jsonOrDie(res, 'Failed to sync commands');
  },

  // Flows
  async getFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}`);
    if (!res.ok) return null;
    return _jsonOrDie(res, 'Failed to load flow');
  },
  async saveFlow(botId, { name, nodes, edges, viewport }) {
    const res = await fetch(`${API_BASE}/flows/${botId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nodes, edges, viewport })
    });
    return _jsonOrDie(res, 'Failed to save flow');
  },
  async getNodeCatalog() {
    const res = await fetch(`${API_BASE}/flows/catalog`);
    return _jsonOrDie(res, 'Failed to load catalog');
  },
  async exportFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}/export`);
    return _jsonOrDie(res, 'Export failed');
  },
  async importFlow(botId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/flows/${botId}/import`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, 'Import failed');
  },

  async refreshBotInfo(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/refresh`, {
      method: 'POST',
    });
    return _jsonOrDie(res, 'Refresh failed');
  },

  async uploadBotAvatar(botId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/bots/${botId}/avatar`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, 'Upload failed');
  },

  async getBotDbSchema(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/database-schema`);
    if (!res.ok) return null;
    return _jsonOrDie(res, 'Failed to load schema');
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
    return _jsonOrDie(res, 'Simulation failed');
  },

  // Plugins
  async getPlugins() {
    const res = await fetch(`${API_BASE}/plugins`);
    return _jsonOrDie(res, 'Failed to load plugins');
  },
  async togglePlugin(pluginKey, isActive) {
    const res = await fetch(`${API_BASE}/plugins/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin_key: pluginKey, is_active: isActive })
    });
    return _jsonOrDie(res, 'Failed to toggle plugin');
  },

  // Languages & Fonts
  async getLanguages() {
    const res = await fetch(`${API_BASE}/i18n/languages`);
    return _jsonOrDie(res, 'Failed to load languages');
  },
  async uploadLanguage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/i18n/upload`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, 'Language upload failed');
  },
  async getFonts() {
    const res = await fetch(`${API_BASE}/fonts`);
    return _jsonOrDie(res, 'Failed to load fonts');
  },

  // System
  async getSystemInfo() {
    const res = await fetch(`${API_BASE}/system/info`);
    return _jsonOrDie(res, 'Failed to get system info');
  },
  async checkUpdate() {
    const res = await fetch(`${API_BASE}/system/check-update`);
    return _jsonOrDie(res, 'Update check failed');
  },
  async triggerUpdate() {
    const res = await fetch(`${API_BASE}/system/update`, { method: 'POST' });
    return _jsonOrDie(res, 'Update failed');
  },
  async getProxyConfig() {
    const res = await fetch(`${API_BASE}/system/proxy`);
    return _jsonOrDie(res, 'Failed to load proxy config');
  },
  async saveProxyConfig(config) {
    const res = await fetch(`${API_BASE}/system/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return _jsonOrDie(res, 'Failed to save proxy config');
  },
  async testProxy(config) {
    const res = await fetch(`${API_BASE}/system/proxy/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return _jsonOrDie(res, 'Proxy test failed');
  }
};
