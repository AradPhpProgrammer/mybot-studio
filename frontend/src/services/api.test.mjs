import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api.js';

test('API errors preserve backend detail rather than swallowing it in the JSON catch', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Specific backend diagnostic' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  try { await assert.rejects(api.getBots(), /Specific backend diagnostic/); }
  finally { globalThis.fetch = original; }
});

test('API fallback errors follow the selected locale', async () => {
  const original = globalThis.fetch;
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => 'fa' }, configurable: true });
  globalThis.fetch = async () => new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  try { await assert.rejects(api.getBots(), /ربات/); }
  finally {
    globalThis.fetch = original;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage;
  }
});
