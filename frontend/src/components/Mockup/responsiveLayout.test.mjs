import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function render(component, width = 360, locale = 'en') {
  const outfile = `${process.cwd()}/.responsive-render-${crypto.randomUUID()}.mjs`;
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { I18nProvider } from './src/locales/i18n.jsx';
    import TelegramMockup from './src/components/Mockup/TelegramMockup.jsx';
    import Navbar from './src/components/Header/Navbar.jsx';
    import BotSettingsModal from './src/components/Header/BotSettingsModal.jsx';
    const bot = { id: 1, username: 'testbot', name: 'Test', settings: {} };
    export const render = () => renderToStaticMarkup(<I18nProvider>${component}</I18nProvider>);
  `, loader: 'jsx', resolveDir: process.cwd() }, jsx: 'automatic', bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  await writeFile(outfile, result.outputFiles[0].text);
  globalThis.window = { innerWidth: width, innerHeight: 740 };
  globalThis.localStorage = { getItem: () => locale };
  try { return (await import(pathToFileURL(outfile))).render(); }
  finally { await unlink(outfile); delete globalThis.window; delete globalThis.localStorage; }
}

test('initial 360/390px mockup geometry fits without waiting for resize', async () => {
  for (const width of [360, 390]) {
    const html = await render('<TelegramMockup currentBot={bot} nodes={[]} />', width);
    assert.match(html, /left:8px/);
    assert.match(html, new RegExp(`width:${width - 16}px`));
    assert.match(html, /class="telegram-mockup /);
  }
});

test('navbar and settings expose scoped responsive regions in both directions', async () => {
  for (const locale of ['en', 'fa']) {
    const navbar = await render('<Navbar currentBot={bot} allBots={[bot]} isDirty theme="light" />', 360, locale);
    assert.match(navbar, /studio-navbar /);
    assert.match(navbar, /navbar-identity /);
    assert.match(navbar, /navbar-actions /);
    assert.match(navbar, /navbar-quick-controls /);
    const settings = await render('<BotSettingsModal isOpen bot={bot} />', 360, locale);
    assert.match(settings, /bot-settings-dialog /);
    assert.match(settings, /settings-identity-grid/);
    assert.match(settings, new RegExp(`dir="${locale === 'fa' ? 'rtl' : 'ltr'}"`));
  }
});

test('mobile stylesheet docks physically right, exposes toolbar without hover, and stacks fields', async () => {
  // CSS contracts only; layout and tap interactions are separately browser-tested.
  const css = await readFile('src/index.css', 'utf8');
  assert.match(css, /\.telegram-mockup\s*\{[^}]*top:\s*auto\s*!important/s);
  assert.match(css, /\.studio-navbar\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.navbar-identity\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.settings-identity-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
});
