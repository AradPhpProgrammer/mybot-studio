import { translate as t } from '../locales/translate.js';

// Localize authored diagnostics, retaining server detail (including validation arrays).
async function _jsonOrDie(res, fallbackMsg) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) {
    throw new Error(t('api_errors.non_json', { status: res.status, type: ct || '—' }));
  }
  let result;
  try { result = await res.json(); }
  catch { throw new Error(fallbackMsg || t('api_errors.invalid_json')); }
  if (!res.ok) {
    const detail = result?.detail;
    throw new Error((typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : '') || fallbackMsg || t('api_errors.status', { status: res.status }));
  }
  return result;
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
    return _jsonOrDie(res, t('login.error'));
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
    return _jsonOrDie(res, t('api_errors.credentials'));
  },

  // Bots
  async getBots() {
    const res = await fetch(`${API_BASE}/bots`);
    return _jsonOrDie(res, t('api_errors.bots'));
  },
  async createBot(token, customProxy = '', cfWorkerUrl = '') {
    const res = await fetch(`${API_BASE}/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, custom_proxy: customProxy, cf_worker_url: cfWorkerUrl })
    });
    return _jsonOrDie(res, t('api_errors.create_bot'));
  },
  async getBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`);
    return _jsonOrDie(res, t('api_errors.bot'));
  },
  async updateBotSettings(botId, settings) {
    const res = await fetch(`${API_BASE}/bots/${botId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return _jsonOrDie(res, t('api_errors.bot_settings'));
  },
  async toggleBotActive(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/toggle-active`, {
      method: 'POST'
    });
    return _jsonOrDie(res, t('api_errors.bot_toggle'));
  },
  async deleteBot(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}`, { method: 'DELETE' });
    return _jsonOrDie(res, t('api_errors.bot_delete'));
  },
  async syncCommands(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/sync-commands`, { method: 'POST' });
    return _jsonOrDie(res, t('api_errors.commands'));
  },

  // Flows
  async getFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}`);
    if (!res.ok) return null;
    return _jsonOrDie(res, t('api_errors.flow'));
  },
  async saveFlow(botId, { name, nodes, edges, viewport }) {
    const res = await fetch(`${API_BASE}/flows/${botId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nodes, edges, viewport })
    });
    return _jsonOrDie(res, t('api_errors.flow_save'));
  },
  async getNodeCatalog() {
    const res = await fetch(`${API_BASE}/flows/catalog`);
    return _jsonOrDie(res, t('api_errors.catalog'));
  },
  async exportFlow(botId) {
    const res = await fetch(`${API_BASE}/flows/${botId}/export`);
    return _jsonOrDie(res, t('api_errors.export'));
  },
  async importFlow(botId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/flows/${botId}/import`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, t('api_errors.import'));
  },

  async refreshBotInfo(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/refresh`, {
      method: 'POST',
    });
    return _jsonOrDie(res, t('api_errors.refresh'));
  },

  async uploadBotAvatar(botId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/bots/${botId}/avatar`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, t('api_errors.upload'));
  },

  async getBotDbSchema(botId) {
    const res = await fetch(`${API_BASE}/bots/${botId}/database-schema`);
    if (!res.ok) return null;
    return _jsonOrDie(res, t('api_errors.schema'));
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
    return _jsonOrDie(res, t('api_errors.simulation'));
  },

  // Plugins
  async getPlugins() {
    const res = await fetch(`${API_BASE}/plugins`);
    return _jsonOrDie(res, t('api_errors.plugins'));
  },
  async togglePlugin(pluginKey, isActive) {
    const res = await fetch(`${API_BASE}/plugins/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin_key: pluginKey, is_active: isActive })
    });
    return _jsonOrDie(res, t('api_errors.plugin_toggle'));
  },

  // Languages & Fonts
  async getLanguages() {
    const res = await fetch(`${API_BASE}/i18n/languages`);
    return _jsonOrDie(res, t('api_errors.languages'));
  },
  async uploadLanguage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/i18n/upload`, {
      method: 'POST',
      body: formData
    });
    return _jsonOrDie(res, t('api_errors.language_upload'));
  },
  async getFonts() {
    const res = await fetch(`${API_BASE}/fonts`);
    return _jsonOrDie(res, t('api_errors.fonts'));
  },

  // System
  async getSystemInfo() {
    const res = await fetch(`${API_BASE}/system/info`);
    return _jsonOrDie(res, t('api_errors.system'));
  },
  async checkUpdate() {
    const res = await fetch(`${API_BASE}/system/check-update`);
    return _jsonOrDie(res, t('api_errors.update_check'));
  },
  async triggerUpdate() {
    const res = await fetch(`${API_BASE}/system/update`, { method: 'POST' });
    return _jsonOrDie(res, t('api_errors.update'));
  },
  async getProxyConfig() {
    const res = await fetch(`${API_BASE}/system/proxy`);
    return _jsonOrDie(res, t('api_errors.proxy'));
  },
  async saveProxyConfig(config) {
    const res = await fetch(`${API_BASE}/system/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return _jsonOrDie(res, t('api_errors.proxy_save'));
  },
  async testProxy(config) {
    const res = await fetch(`${API_BASE}/system/proxy/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return _jsonOrDie(res, t('api_errors.proxy_test'));
  }
};
