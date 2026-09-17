// Browser regression against the real frontend; API is isolated test fixtures.
// No requests are sent to Telegram or the user's bot database.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const en = require('./src/locales/en.json');
const key = p => p.split('.').reduce((v,k)=>v[k],en);
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors = []; page.on('pageerror',e=>errors.push(e.message));
 const bot={id:987654,name:'Browser regression fixture',username:'qa_fixture',is_active:false,settings:{enable_user_database:true}};
 let flow={nodes:[
 {id:'send',type:'action_send_message',position:{x:100,y:100},data:{text:'Original',media_type:'text'}},
 {id:'kb',type:'action_keyboard',position:{x:450,y:100},data:{keyboard_type:'inline',buttons:[[{text:'First',callback_data:'first',style:'primary'}]]}},
 ],edges:[{id:'link',source:'send',target:'kb',sourceHandle:'exec',targetHandle:'exec'}]};
 let saved=[];
 await page.route('**/api/**', async route=>{
  const url=new URL(route.request().url()); let data={};
  if(url.pathname==='/api/bots') data=[bot];
  else if(url.pathname==='/api/flows/987654'){
   if(route.request().method()==='POST'){ flow=route.request().postDataJSON();saved.push(structuredClone(flow)); }
   data=flow;
  } else if(url.pathname.endsWith('/database-schema')) data={tracked_fields:['custom_variables'],fields:[]};
  else if(url.pathname.endsWith('/catalog')) data=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(bot=>{
  localStorage.setItem('mybot_token','TEST_FIXTURE_NOT_A_CREDENTIAL');
  localStorage.setItem('mybot_view','studio');localStorage.setItem('mybot_current_bot_id',String(bot.id));
  localStorage.setItem('mybot_current_bot',JSON.stringify(bot));localStorage.setItem('mybot_lang','en');localStorage.setItem('mybot_theme','light');
 },bot);
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 const text=page.locator('.react-flow__node[data-id="send"] textarea');
 await text.waitFor();
 await text.fill('Changed text');
 await page.getByText(key('navbar.unsaved_changes'),{exact:true}).waitFor({state:'attached'});
 await text.press('Control+z');assert.equal(await text.inputValue(),'Original');
 await text.press('Control+Shift+z');assert.equal(await text.inputValue(),'Changed text');
 await text.press('Control+Shift+s');
 await page.waitForFunction(()=>!document.body.innerText.includes('Saving...'));
 await page.waitForTimeout(200);
 assert.equal(saved.length,1);assert.equal(saved[0].nodes.find(n=>n.id==='send').data.text,'Changed text');
 assert.equal(await page.getByText(key('navbar.unsaved_changes'),{exact:true}).count(),0);
 const keyboard=page.locator('.react-flow__node[data-id="kb"]');
 const add=keyboard.getByRole('button',{name:key('nodes.action_keyboard.add_row'),exact:true});
 await add.click();
 await page.getByText(key('navbar.unsaved_changes'),{exact:true}).waitFor({state:'attached'});
 await page.keyboard.press('Control+Shift+s');await page.waitForTimeout(200);
 assert.equal(saved.length,2);assert.equal(saved[1].nodes.find(n=>n.id==='kb').data.buttons.length,2);
 const colors=await keyboard.locator('[data-keyboard-editor]').evaluate(el=>({outer:getComputedStyle(el).backgroundColor,header:getComputedStyle(el.firstElementChild).backgroundColor}));
 assert.notEqual(colors.outer,colors.header);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({pass:true,checks:['real ReactFlow text update → dirty','focused Ctrl+Z and Ctrl+Shift+Z','Ctrl+Shift+S snapshot payload','save clears dirty','button addition → dirty and saved markup','light surface contrast','no uncaught browser errors'],colors,api:'isolated fixture, no real database writes'},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
