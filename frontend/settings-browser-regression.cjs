// Real browser/component, isolated API fixtures only. Run with Vite on port 23568.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const en = require('./src/locales/en.json');
const t = p => p.split('.').reduce((v,k)=>v[k], en);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let bot={id:987654,name:'Settings fixture',username:'verified_fixture_bot',is_active:false,settings:{}};
 let pendingSchema;let saves=[];let rejectToken=false;let syncFails=false;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let data={};
  if(url.pathname==='/api/bots') data=[bot];
  else if(url.pathname.endsWith('/database-schema')) {pendingSchema=route;return;}
  else if(url.pathname.endsWith('/settings') && route.request().method()==='PUT'){
   const payload=route.request().postDataJSON();
   if(rejectToken){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({detail:'bot_token_verification_failed'})});return;}
   saves.push(payload);const {token,name,...settings}=payload;bot={...bot,name,settings};
   data={success:true,name,username:bot.username,settings,telegram_sync:{name:!syncFails}};
  } else if(url.pathname.startsWith('/api/flows/')) data={nodes:[],edges:[]};
  else if(url.pathname.endsWith('/catalog')) data=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(bot=>{
  localStorage.setItem('mybot_token','TEST_FIXTURE_NOT_A_CREDENTIAL');
  localStorage.setItem('mybot_view','studio');localStorage.setItem('mybot_current_bot_id',String(bot.id));
  localStorage.setItem('mybot_current_bot',JSON.stringify(bot));localStorage.setItem('mybot_lang','en');
 },bot);
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 const open=async()=>{await page.mouse.move(700,2);await page.getByRole('button',{name:t('navbar.bot_settings'),exact:true}).click();await page.locator('#bot-display-name').waitFor();};
 const releaseSchema=async()=>{assert.ok(pendingSchema);await pendingSchema.fulfill({status:200,contentType:'application/json',body:JSON.stringify({database_file:'fixture_delayed.db',subscribers_count:7,tracked_fields:['telegram_id','chat_id','custom_variables']})});pendingSchema=null;};
 await open();
 assert.equal(await page.locator('#bot-username').getAttribute('readonly'),'');
 await page.getByRole('button',{name:new RegExp(t('bot_settings.tracked_fields.db_title'))}).click();
 const master=page.getByRole('checkbox').first();
 assert.equal(await master.isChecked(),true);
 await master.uncheck();
 await releaseSchema();
 await page.getByText('fixture_delayed.db',{exact:false}).waitFor();
 assert.equal(await master.isChecked(),false);
 await page.locator('#bot-display-name').fill('Local saved name');
 await page.locator('button[type="submit"]').click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(saves[0].enable_user_database,false);
 assert.equal(saves[0].tracked_user_fields.includes('custom_variables'),false);
 assert.equal('username' in saves[0],false);
 await open();assert.equal(await master.isChecked(),false);await releaseSchema();
 await master.check();
 await page.locator('button[type="submit"]').click();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(saves[1].enable_user_database,true);
 await open();await releaseSchema();assert.equal(await master.isChecked(),true);
 rejectToken=true;await page.locator('#bot-token').fill('invalid-fixture-token');
 await page.locator('button[type="submit"]').click();await page.getByRole('alert').waitFor();
 assert.ok(await page.getByRole('dialog').isVisible());assert.equal(saves.length,2);
 assert.equal((await page.evaluate(()=>localStorage.getItem('mybot_current_bot'))).includes('invalid-fixture-token'),false);
 rejectToken=false;syncFails=true;await page.locator('#bot-token').fill('');
 await page.locator('button[type="submit"]').click();
 await page.getByRole('alert').waitFor();await page.waitForTimeout(700);
 assert.ok(await page.getByRole('dialog').isVisible());
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({passed:true,checks:['username read-only and omitted from save','feature missing defaults true','late schema retains unsaved false','false save/reopen then true save/reopen','local display name saved','invalid token leaves modal open and does not enter localStorage','profile sync warning leaves saved modal open','no page errors'],api:'isolated fixtures, no real DB/Telegram'}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
