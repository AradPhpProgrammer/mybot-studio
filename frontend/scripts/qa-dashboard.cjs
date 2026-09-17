// Mobile dashboard QA; isolated API fixtures, no real writes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 for(const lang of ['fa','en']) {
 const page=await browser.newPage({viewport:{width:360,height:780},hasTouch:true,isMobile:true});
 const tr=require(`../src/locales/${lang}.json`);const t=k=>k.split('.').reduce((v,p)=>v[p],tr);
 await page.route('**/api/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname==='/api/bots'?[{id:1,name:'QA mobile dashboard',username:'qa_fixture',is_active:false,settings:{}}]:[])}));
 await page.addInitScript(lang=>{localStorage.setItem('mybot_token','QA_FIXTURE');localStorage.setItem('mybot_view','dashboard');localStorage.setItem('mybot_lang',lang);localStorage.setItem('mybot_theme','dark')},lang);
 await page.goto('http://127.0.0.1:5173');
 const refresh=page.getByTitle(t('dashboard.refresh_bot'),{exact:true});await refresh.waitFor();
 const state=await refresh.evaluate(el=>{let opacity=1;for(let p=el;p;p=p.parentElement) opacity*=Number(getComputedStyle(p).opacity);const r=el.getBoundingClientRect();return {opacity,x:r.x,right:r.right,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert.ok(state.opacity>0.9,JSON.stringify(state));
 assert.ok(state.x>=0 && state.right<=360,JSON.stringify(state));assert.equal(state.overflow,false);
 console.log('PASS dashboard mobile',lang,state);await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
