import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('Edit tab has compact controls, while the canvas editor keeps its header and connection guidance', async () => {
  const outfile = `${process.cwd()}/.compact-render-${crypto.randomUUID()}.mjs`;
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { I18nProvider } from './src/locales/i18n.jsx';
    import TelegramMockup from './src/components/Mockup/TelegramMockup.jsx';
    import KeyboardLayoutEditor from './src/components/Nodes/KeyboardLayoutEditor.jsx';
    export const render = (node, full) => renderToStaticMarkup(<I18nProvider>{full
      ? <KeyboardLayoutEditor nodeId={node.id} data={node.data} nodes={[node]} onChange={() => {}} />
      : <TelegramMockup selectedNode={node} nodes={[node]} onUpdateNodeData={() => {}} />}</I18nProvider>);
  `, loader: 'jsx', resolveDir: process.cwd() }, jsx: 'automatic', bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  await writeFile(outfile, result.outputFiles[0].text);
  globalThis.window = { innerWidth: 360, innerHeight: 740 };
  globalThis.localStorage = { getItem: () => 'en' };
  try {
    const { render } = await import(pathToFileURL(outfile));
    for (const type of ['action_keyboard', 'action_reply_keyboard', 'action_send_message']) {
      const node = { id: 'kb', type, data: { buttons: [[{ text: 'Home', callback_data: 'home' }]] } };
      const compact = render(node, false);
      assert.match(compact, /data-keyboard-variant="compact"/);
      assert.doesNotMatch(compact, /data-keyboard-heading|data-keyboard-connection/);
      assert.match(compact, /value="Home"/);
      assert.match(compact, /aria-label="Keyboard type"/);
      assert.match(compact, /aria-label="Move left"/);
      assert.match(compact, /left:8px/);
    }
    const full = render({ id: 'kb', type: 'action_keyboard', data: {} }, true);
    assert.match(full, /data-keyboard-heading/);
    assert.match(full, /data-keyboard-connection/);
  } finally {
    await unlink(outfile);
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
