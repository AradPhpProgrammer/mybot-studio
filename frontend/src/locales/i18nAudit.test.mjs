import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { parse } from '@babel/parser';

const root = fileURLToPath(new URL('../', import.meta.url));
const flatten = (value, prefix = '') => Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return typeof item === 'object' ? Object.entries(flatten(item, path)) : [[path, item]];
}));
const locales = Object.fromEntries(['en', 'fa', 'ar', 'ru'].map(lang => [lang, flatten(JSON.parse(readFileSync(join(root, 'locales', `${lang}.json`), 'utf8')))]));
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]); }
function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'tokens', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value && typeof value === 'object') walk(value, visit, node);
  }
}
const sources = files(root).filter(file => /\.(jsx|js|mjs)$/.test(file) && !/\.test\./.test(file));
const asts = sources.map(file => ({ file: relative(root, file).replaceAll('\\', '/'), ast: parse(readFileSync(file, 'utf8'), { sourceType: 'module', sourceFilename: file, plugins: ['jsx'] }) }));
const required = ['common.flow_save_error', 'common.flow_commands_sync_error', 'nodes.action_keyboard.reply_requires_send'];

test('all bundled locales have matching nonempty keys and interpolation variables', () => {
  const failures = [];
  for (const [lang, values] of Object.entries(locales)) {
    for (const key of new Set([...Object.keys(locales.en), ...Object.keys(values), ...required])) {
      if (typeof values[key] !== 'string' || !values[key].trim()) failures.push(`${lang}: missing/empty ${key}`);
      if (!(key in locales.en)) failures.push(`en: missing ${key}`);
      const vars = text => [...new Set(String(text).match(/\{\w+\}/g) || [])].sort();
      if (JSON.stringify(vars(values[key])) !== JSON.stringify(vars(locales.en[key]))) failures.push(`${lang}: interpolation mismatch ${key}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('literal translation calls resolve in every bundled locale; no inline translation fallbacks', () => {
  const failures = [];
  for (const { file, ast } of asts) walk(ast, (node, parent) => {
    if (node.type !== 'CallExpression' || !['t', 'label'].includes(node.callee?.name)) return;
    const key = node.arguments[0];
    if (key?.type === 'ConditionalExpression') {
      for (const branch of [key.consequent, key.alternate]) if (branch.type === 'StringLiteral') {
        const path = node.callee.name === 'label' ? `nodes.action_keyboard.${branch.value}` : branch.value;
        for (const [lang, values] of Object.entries(locales)) if (typeof values[path] !== 'string') failures.push(`${file}:${node.loc.start.line}: ${lang} missing ${path}`);
      }
    }
    if (key?.type === 'StringLiteral') {
      const path = node.callee.name === 'label' ? `nodes.action_keyboard.${key.value}` : key.value;
      for (const [lang, values] of Object.entries(locales)) if (typeof values[path] !== 'string') failures.push(`${file}:${node.loc.start.line}: ${lang} missing ${path}`);
    }
    if (node.arguments.slice(1).some(arg => arg.type === 'StringLiteral') || (parent?.type === 'LogicalExpression' && parent.left === node && parent.operator === '||')) failures.push(`${file}:${node.loc.start.line}: inline translation fallback`);
  });
  assert.deepEqual(failures, []);
});

// Explicit technical/data examples, not prose. Do not broaden this to silence labels.
const technical = new Set(['admin', 'iteration', 'result', 'http_response', 'btn_identifier', '$balance', 'https://api.openai.com/v1/chat...', '/start', 'v', 'A', 'B']);
test('component JSX text and label attributes contain no authored hardcoded prose', () => {
  const failures = [];
  for (const { file, ast } of asts.filter(source => source.file.startsWith('components/'))) walk(ast, (node, parent) => {
    let value;
    if (node.type === 'JSXText') value = node.value.trim();
    if (node.type === 'StringLiteral' && parent?.type === 'JSXAttribute' && ['title', 'aria-label', 'alt', 'placeholder'].includes(parent.name.name)) value = node.value;
    if (value && /\p{L}/u.test(value) && !technical.has(value)) failures.push(`${file}:${node.loc.start.line}: ${value}`);
  });
  assert.deepEqual(failures, []);
});


test('finite dynamic node, keyboard, media and tracked-field key families resolve', () => {
  const keys = new Set();
  for (const { file, ast } of asts) walk(ast, node => {
    if (node.type !== 'ObjectProperty' || node.value?.type !== 'StringLiteral') return;
    const value = node.value.value;
    if (file.endsWith('QuickSearchPalette.jsx') && node.key.name === 'type') {
      keys.add(`nodes.${value}.name`); keys.add(`nodes.${value}.desc`);
    }
    if (file.endsWith('BotSettingsModal.jsx') && node.key.name === 'key') keys.add(`bot_settings.tracked_fields.fields.${value}`);
    if (file.endsWith('KeyboardLayoutEditor.jsx') && node.key.name === 'key' && value.startsWith('move_')) keys.add(`nodes.action_keyboard.${value}`);
  });
  for (const type of ['text', 'photo', 'video', 'voice', 'document']) keys.add(`mockup.media_types.${type}`);
  for (const style of ['primary', 'success', 'danger', 'default']) keys.add(`nodes.action_keyboard.color_${style}`);
  for (const type of ['math', 'math_add', 'math_subtract', 'math_multiply', 'math_divide']) keys.add(`nodes.${type}.name`);
  const failures = [];
  for (const key of keys) for (const [lang, values] of Object.entries(locales)) if (typeof values[key] !== 'string') failures.push(`${lang}: ${key}`);
  assert.deepEqual(failures, []);
});
