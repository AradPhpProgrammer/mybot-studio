// Real App; all API writes intercepted, never touch registered bots.
const {chromium}=require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const scope=process.argv[2]||'all';
for(const [theme,lang,width] of [['light','en',1500],['dark','fa',1500],['light','en',390],['dark','fa',390]]){
 const page=await browser.newPage({viewport:{width,height:950},hasTouch:width<500});page.setDefaultTimeout(8000);
 const tr=require(`../src/locales/${lang}.json`),t=k=>k.split('.').reduce((v,k)=>v[k],tr);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bot={id:987654,name:'Fixture',username:'fixture',photo_url:'/media/broken.png',settings:{}};
 let flow={nodes:[{id:'send',type:'action_send_message',position:{x:0,y:0},data:{text:'Retained text'}},{id:'kb',type:'action_keyboard',position:{x:400,y:0},data:{keyboard_type:'inline',buttons:[[{text:'Retained button',callback_data:'cb',style:'success'}]]}}],edges:[{id:'link',source:'send',target:'kb',sourceHandle:'exec',targetHandle:'exec'}]};
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;let data={};if(p==='/api/bots')data=[bot];else if(p==='/api/flows/987654'){if(r.request().method()==='POST')flow=r.request().postDataJSON();data=flow;}else if(p.endsWith('/catalog'))data=[];await r.fulfill({json:data});});
 await page.route('**/media/broken.png',r=>r.fulfill({status:404,body:''}));
 await page.addInitScript(({bot,theme,lang,scope})=>{for(const[k,v]of Object.entries({mybot_token:'FIXTURE',mybot_view:scope==='avatar'?'dashboard':'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_theme:theme,mybot_lang:lang}))localStorage.setItem(k,v)},{bot,theme,lang,scope});
 await page.goto('http://127.0.0.1:5173');
 if(scope==='avatar'){
  const img=page.locator('img[title="'+t('dashboard.upload_photo')+'"]');await img.waitFor();await page.waitForFunction(()=>[...document.images].some(i=>i.getAttribute('src')==='/default-bot.png'&&i.naturalWidth>0));assert.equal(await img.getAttribute('alt'),'');
 }else{
 await page.locator('.react-flow__node[data-id="kb"]').waitFor().catch(async e=>{console.log(await page.locator('.react-flow__node').evaluateAll(ns=>ns.map(n=>({id:n.dataset.id,style:n.getAttribute('style'),html:n.innerHTML.slice(0,450),rect:n.getBoundingClientRect().toJSON()}))));console.log(errors);throw e;});
 await page.locator('.telegram-mockup').getByTitle(t('common.minimize'),{exact:true}).click();
 if(scope==='canvas'||scope==='all'){
  const plus=page.locator('.react-flow__panel').getByRole('button',{name:t('canvas.add_node_here'),exact:true});assert.equal(await plus.isVisible(),width<500,'desktop + hidden, touch + visible');
  if(width<500)await plus.click();else await page.locator('.react-flow__pane').click({button:'right',position:{x:200,y:800}});
  const input=page.getByPlaceholder(t('common.search'),{exact:true});await input.waitFor();await page.waitForTimeout(100);assert.equal(await input.evaluate(e=>e===document.activeElement),true);
  await input.fill('action_keyboard');const item=page.getByRole('listbox').getByRole('option').first();await item.hover();assert.equal(await input.evaluate(e=>e===document.activeElement),true);
  const colors=await item.evaluate(e=>{const s=getComputedStyle(e);return{bg:s.backgroundColor,color:s.color,opacity:s.opacity}});assert.notEqual(colors.color,colors.bg);assert.equal(colors.opacity,'1');await input.press('Escape');
 }
 if((scope==='keyboard'||scope==='all')&&width>500){
  const kb=page.locator('.react-flow__node[data-id="kb"]');assert.equal(await kb.getByText(t('nodes.action_keyboard.mode_hint'),{exact:true}).count(),0);
  const select=kb.locator('select');assert.equal(await select.evaluate(e=>getComputedStyle(e).appearance),'none');
  const text=kb.locator('input').filter({hasNot:page.locator('[type=hidden]')}).last();assert.equal(await text.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 }
 if(scope==='collapse'||scope==='all'){
  for(const id of ['send','kb']){const n=page.locator(`.react-flow__node[data-id="${id}"]`);const before=await n.boundingBox();const handles=await n.locator('.react-flow__handle').count();const button=n.locator('[data-node-collapse]');await button.click();assert.equal(await button.getAttribute('aria-expanded'),'false');assert.ok((await n.boundingBox()).height<before.height);assert.equal(await n.locator('.react-flow__handle').count(),handles);await n.locator('.node-fold-summary').getByText(id==='send'?'Retained text':'Retained button',{exact:false}).waitFor();const box=await button.boundingBox(),outer=await n.boundingBox();assert.ok(Math.abs(box.x+box.width/2-(outer.x+outer.width/2))<3);await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');}
  assert.equal(await page.locator('.react-flow__node[data-id="send"] textarea').inputValue(),'Retained text');assert.equal(await page.locator('.react-flow__edge[data-id="link"]').count(),1);
 }
 }
 assert.deepEqual(errors,[]);console.log('PASS',scope,theme,lang,width);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
