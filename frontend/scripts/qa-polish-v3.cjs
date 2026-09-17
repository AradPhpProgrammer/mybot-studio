// Browser QA for the three user-reported polish items:
// 1) collapse button has clean button styling without black shadow in dark & light
// 2) collapsed node stays collapsed after full page reload (localStorage persistence)
// 3) search input in right-click QuickSearchPalette has no blue outline
const {chromium}=require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const theme of ['dark','light']){
 const page=await browser.newPage({viewport:{width:1400,height:900}});page.setDefaultTimeout(8000);
 const tr=require(`../src/locales/en.json`),t=k=>k.split('.').reduce((v,k)=>v[k],tr);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bot={id:987654,name:'Fixture',username:'fixture',settings:{}};
 let flow={nodes:[{id:'send',type:'action_send_message',position:{x:0,y:0},data:{text:'Persisted across reload'}}],edges:[]};
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;let data={};if(p==='/api/bots')data=[bot];else if(p.startsWith('/api/flows/987654'))data=flow;else if(p.endsWith('/catalog'))data=[];await r.fulfill({json:data});});
 await page.addInitScript(({theme,bot})=>{if(!localStorage.getItem('mybot_token')){localStorage.setItem('mybot_token','F');localStorage.setItem('mybot_view','studio');localStorage.setItem('mybot_current_bot_id',String(bot.id));localStorage.setItem('mybot_current_bot',JSON.stringify(bot));localStorage.setItem('mybot_theme',theme);localStorage.setItem('mybot_lang','en');}},{theme,bot});
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 await page.locator('.react-flow__node[data-id="send"]').waitFor();
 const btn=page.locator('.react-flow__node[data-id="send"] [data-node-collapse]');
 // Whole node body and fold shell must not cast a shadow.
 const body=page.locator('.react-flow__node[data-id="send"] .node-fold-content > div');
 for (const target of [body,page.locator('.react-flow__node[data-id="send"] .node-fold-shell')]) {
   assert.equal(await target.evaluate(el=>getComputedStyle(el).boxShadow),'none','whole node is shadow-free');
 }
 const glass=await body.evaluate(el=>({background:getComputedStyle(el).backgroundColor,blur:getComputedStyle(el).backdropFilter}));
 assert.notEqual(glass.blur,'none','subtle glass blur on body');
 assert.match(glass.background,/rgba|color\(|oklab\([^)]*\//,'slightly translucent surface');
 const navbar=page.locator('.studio-navbar');
 const navStyle=await navbar.evaluate(el=>({background:getComputedStyle(el).backgroundColor,blur:getComputedStyle(el).backdropFilter,shadow:getComputedStyle(el).boxShadow}));
 assert.match(navStyle.background,/rgba|color\(|oklab\([^)]*\//,'navbar translucent');
 assert.notEqual(navStyle.blur,'none','navbar glass blur');
 assert.equal(navStyle.shadow,'none');
 // 1) Button style + no black shadow
 const style=await btn.evaluate(el=>{const s=getComputedStyle(el);return{bg:s.backgroundColor,boxShadow:s.boxShadow,border:s.borderWidth}});
 assert.notEqual(style.bg,'rgba(0, 0, 0, 0)','button has a visible background');
 assert.equal(style.boxShadow,'none','no dark box-shadow');
 // 2) Collapse and reload
 await btn.click();assert.equal(await btn.getAttribute('aria-expanded'),'false');
 await page.reload();
 await page.locator('.react-flow__node[data-id="send"]').waitFor();
 const reloadedBtn=page.locator('.react-flow__node[data-id="send"] [data-node-collapse]');
 assert.equal(await reloadedBtn.getAttribute('aria-expanded'),'false','persists collapsed state after page reload');
 await page.locator('.react-flow__node[data-id="send"] .node-fold-summary').waitFor();
 // 3) Right-click QuickSearch palette: input has no blue focus ring
 await page.locator('.react-flow__pane').click({button:'right',position:{x:250,y:250}});
 const searchInput=page.getByPlaceholder(t('common.search'),{exact:true});await searchInput.waitFor();
 await searchInput.focus();
 const outline=await searchInput.evaluate(el=>{const s=getComputedStyle(el);return{outline:s.outlineStyle,ring:s.boxShadow,border:s.borderColor}});
 assert.equal(outline.outline,'none','no blue outline on right-click palette input');
 assert.deepEqual(errors,[]);
 console.log('PASS polish verified in',theme);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
