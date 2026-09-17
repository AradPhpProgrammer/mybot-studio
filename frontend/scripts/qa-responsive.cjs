// Browser verification with isolated API fixtures. No user DB or Telegram writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.QA_OUTPUT || path.join(require('node:os').tmpdir(), 'mybot-responsive-qa');
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const results=[];
 try {
 for (const [width,height,lang,theme] of [[1440,1000,'en','dark'],[360,780,'fa','dark'],[390,844,'en','light']]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const messages=require(`../src/locales/${lang}.json`);
  const t=p=>p.split('.').reduce((v,k)=>v[k],messages);
  const bot={id:987654,name:'QA fixture',username:'qa_fixture',is_active:false,settings:{enable_user_database:true}};
  const flow={nodes:[
   {id:'send',type:'action_send_message',position:{x:50,y:80},data:{text:'QA message'}},
   {id:'kb',type:'action_keyboard',position:{x:420,y:80},data:{keyboard_type:'inline',buttons:[[{text:'QA button',callback_data:'qa',style:'primary'}]]}},
   {id:'alert',type:'action_answer_callback',position:{x:50,y:410},data:{text:'QA callback',show_alert:false}}
  ],edges:[{id:'link',source:'send',target:'kb',sourceHandle:'exec',targetHandle:'exec'}]};
  await page.route('**/api/**',route=>{
   const p=new URL(route.request().url()).pathname;
   const data=p==='/api/bots'?[bot]:p==='/api/flows/987654'?flow:p==='/api/fonts'?[]:p.endsWith('/database-schema')?{tracked_fields:['custom_variables'],fields:[]} : {};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(({bot,lang,theme})=>{
   for(const [k,v] of Object.entries({mybot_token:'QA_FIXTURE_NOT_A_CREDENTIAL',mybot_view:'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_lang:lang,mybot_theme:theme})) localStorage.setItem(k,v);
  },{bot,lang,theme});
  await page.goto('http://127.0.0.1:5173');
  await page.locator('.react-flow__node[data-id="kb"]').waitFor();
  assert.equal(await page.locator('.react-flow').evaluate((el,theme)=>el.classList.contains(theme),theme),true);
  // Select the node through its real React onClick handler; subsequent edits use pointer actions.
  await page.locator('.react-flow__node[data-id="kb"]').dispatchEvent('click');
  const editor=page.locator('.telegram-mockup [data-keyboard-variant="compact"]');
  await editor.waitFor();
  const geometry=async locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scroll:el.scrollWidth,client:el.clientWidth}});
  const panel=page.locator('.telegram-mockup');
  const panelBox=await geometry(panel);
  assert.ok(panelBox.x>=0 && panelBox.right<=width+1 && panelBox.y>=0 && panelBox.bottom<=height+1, JSON.stringify(panelBox));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const mode=editor.locator('select');
  await mode.selectOption('reply');
  await editor.getByRole('button',{name:t('nodes.action_keyboard.add_row'),exact:true}).click();
  await page.getByText(t('navbar.unsaved_changes'),{exact:true}).waitFor({state:'attached'});
  assert.equal(await mode.inputValue(),'reply');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  assert.equal(await mode.inputValue(),'inline');
  await panel.getByTitle(t('common.minimize'),{exact:true}).click();
  const bubble=page.locator('.mockup-bubble');
  await bubble.waitFor();
  const bubbleBox=await geometry(bubble);
  assert.ok(bubbleBox.x>width/2 && bubbleBox.right<=width && bubbleBox.bottom<=height, JSON.stringify(bubbleBox));
  await bubble.click();
  await editor.waitFor();
  // Pin/open toolbar with pointer on desktop; mobile toolbar is always visible.
  if(width>900) await page.mouse.move(30,1);
  const settings=page.getByTitle(t('navbar.bot_settings'),{exact:true});
  await settings.click();
  const dialog=page.locator('.bot-settings-dialog');
  await dialog.waitFor();
  const fields=dialog.locator('.settings-identity-grid .settings-field-input');
  const a=await geometry(fields.nth(0)),b=await geometry(fields.nth(1));
  if(width>900) {assert.ok(Math.abs(a.y-b.y)<1,JSON.stringify({a,b}));assert.ok(Math.abs(a.height-b.height)<1);}
  else {assert.ok(b.y>a.y,JSON.stringify({a,b}));}
  const dialogBox=await geometry(dialog);assert.ok(dialogBox.x>=0 && dialogBox.right<=width+1 && dialogBox.bottom<=height+1,JSON.stringify(dialogBox));
  await page.screenshot({path:path.join(out,`${width}-${lang}-${theme}-settings.png`)});
  await page.keyboard.press('Escape');
  // Preserve evidence even where Escape is not the dialog close mechanism.
  assert.deepEqual(errors,[]);
  results.push({width,height,lang,theme,panelBox,bubbleBox,settingsAligned:width>900,settingsStacked:width<500,compactModeEdit:true,buttonAddUndo:true,errors});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({passed:results.length,results,output:out},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
