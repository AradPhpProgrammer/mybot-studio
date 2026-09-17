const { chromium } = require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('response', r => { if(r.status()>=400) console.error(r.status(), r.url()); });
    page.on('console', m => { if(m.type()==='error') console.error(m.text()); });
    page.setDefaultTimeout(8000);
    let response = { messages: [] };
    const requests = [];
    const tr = require('../../locales/en.json');
    const bot = {id:987654,username:'fixture',settings:{}};
    await page.route('**/api/**', async route => {
      const path=new URL(route.request().url()).pathname;
      let data={};
      if(path==='/api/bots') data=[bot];
      else if(path.endsWith('/simulator/dispatch')) {requests.push(route.request().postDataJSON());data=response;}
      else if(path==='/api/flows/987654') data={nodes:[],edges:[]};
      else if(path.endsWith('/catalog')) data=[];
      await route.fulfill({json:data});
    });
    await page.addInitScript(bot=>{for(const[k,v]of Object.entries({mybot_token:'FIXTURE',mybot_view:'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_lang:'en'}))localStorage.setItem(k,v)},bot);
    await page.goto('http://127.0.0.1:5173');
    await page.getByRole('button', { name: tr.mockup.test_tab, exact: true }).click();
    const send = async messages => {
      response = { messages };
      await page.getByRole('button', { name: '/start', exact: true }).click();
      await page.waitForTimeout(150);
    };
    assert.equal(await page.getByRole('button', { name: 'Unsent graph button', exact: true }).count(), 0);
    await send([{ keyboard_node_id: 'X', text: 'Reply message', reply_markup: { keyboard: [[{ text: 'Delivered reply' }]] } }]);
    await page.getByRole('button', { name: 'Delivered reply', exact: true }).waitFor();
    // Graph editing is covered by canvas QA; this exercises delivered state in the real App.
    assert.equal(await page.getByRole('button', { name: 'Delivered reply', exact: true }).count(), 1, 'editing graph must not clear delivered keyboard');
    response = { messages: [] };
    await page.getByRole('button', { name: 'Delivered reply', exact: true }).click();
    await page.waitForTimeout(100);
    assert.equal(requests.at(-1).payload, 'Delivered reply');
    assert.equal(requests.at(-1).event_type, 'message');
    await send([{ keyboard_node_id: 'X', text: 'Plain delivery', reply_markup: { inline_keyboard: [] } }]);
    assert.equal(await page.getByRole('button', { name: 'Delivered reply', exact: true }).count(), 1);
    await send([{ keyboard_node_id: 'Y', text: 'Unrelated inline', reply_markup: { inline_keyboard: [[{ text: 'Other inline', callback_data: 'other' }]] } }]);
    assert.equal(await page.getByRole('button', { name: 'Delivered reply', exact: true }).count(), 0, 'any inline removes the active reply keyboard');
    assert.equal(await page.getByRole('button', { name: 'Other inline', exact: true }).count(), 1);
    await send([{ keyboard_node_id: 'X', text: 'Inline message', reply_markup: { inline_keyboard: [[{ text: 'Delivered inline', callback_data: 'cb' }]] } }]);
    assert.equal(await page.getByRole('button', { name: 'Delivered reply', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Delivered inline', exact: true }).count(), 1);
    await send([{ keyboard_node_id: 'X', text: 'New reply', reply_markup: { keyboard: [[{ text: 'Replacement reply' }]] } }]);
    assert.equal(await page.getByRole('button', { name: 'Replacement reply', exact: true }).count(), 1);
    await send([{ keyboard_node_id: 'X', is_edit: true, text: 'Edited in place', reply_markup: { inline_keyboard: [[{ text: 'Edited inline', callback_data: 'edit' }]] } }]);
    assert.equal(await page.getByRole('button', { name: 'Replacement reply', exact: true }).count(), 0);
    assert.equal(await page.getByText('New reply', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Edited in place', { exact: true }).count(), 1);
    await send([{ keyboard_node_id: 'X', text: 'Final reply', reply_markup: { keyboard: [[{ text: 'Clear me' }]] } }]);
    await page.getByRole('button', { name: tr.mockup.clear_chat, exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Clear me', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS real TelegramMockup: delivered-only keyboard, same/different source, reply press payload, empty markup retention, automatic inline clearing, replacement, in-place edit, reset; API fully intercepted');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
