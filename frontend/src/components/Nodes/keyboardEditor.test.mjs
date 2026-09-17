import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Render real components without adding a test-only frontend dependency.
async function renderEditTab(node) {
  const outfile = `${process.cwd()}/.keyboard-render-${crypto.randomUUID()}.mjs`;
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { I18nProvider } from './src/locales/i18n.jsx';
    import TelegramMockup from './src/components/Mockup/TelegramMockup.jsx';
    export const render = node => renderToStaticMarkup(<I18nProvider><TelegramMockup selectedNode={node} nodes={[node]} onUpdateNodeData={() => {}} /></I18nProvider>);
  `, loader: 'jsx', resolveDir: process.cwd() }, jsx: 'automatic', bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  await writeFile(outfile, result.outputFiles[0].text);
  globalThis.window = { innerWidth: 1200, innerHeight: 900 };
  globalThis.localStorage = { getItem: () => 'en' };
  try { return (await import(pathToFileURL(outfile))).render(node); }
  finally { await unlink(outfile); delete globalThis.window; delete globalThis.localStorage; }
}

test('Edit tab opens the shared dedicated editor for inline and reply keyboard nodes', async () => {
  for (const keyboard_type of ['inline', 'reply']) {
    const html = await renderEditTab({ id: 'kb', type: 'action_keyboard', data: { keyboard_type, buttons: [[{ text: 'Home', callback_data: 'home', style: 'success' }]] } });
    assert.match(html, /data-keyboard-editor/);
    assert.match(html, new RegExp(`value="${keyboard_type}" selected`));
    assert.match(html, /value="Home"/);
    assert.match(html, /data-graph-editor/);
    assert.doesNotMatch(html, /min-w-\[240px\]/);
  }
});

test('message nodes offer no empty old builder, but existing embedded buttons remain editable', async () => {
  const empty = await renderEditTab({ id: 'send', type: 'action_send_message', data: { text: 'Hello' } });
  assert.doesNotMatch(empty, /data-keyboard-editor/);
  assert.doesNotMatch(empty, /Inline Keyboard/);
  const legacy = await renderEditTab({ id: 'send', type: 'action_send_message', data: { keyboard_type: 'reply', buttons: [[{ text: 'Legacy' }]] } });
  assert.match(legacy, /data-keyboard-editor/);
  assert.match(legacy, /value="Legacy"/);
});
