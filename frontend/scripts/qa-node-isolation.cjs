// Loads an isolated test page via Playwright routing; no test page is published.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[];
 try {
  for(const theme of ['dark','light']) for(const node of ['send','edit']) {
   const page=await browser.newPage({viewport:{width:800,height:700}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/__node-isolation?*',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true; await import("/scripts/node-isolation.jsx");</script></body></html>'}));
   await page.goto(`${process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568'}/__node-isolation?theme=${theme}&node=${node}`);
   const text=page.locator('textarea');await text.waitFor();
   assert.equal(await page.getByTestId('dirty').innerText(),'clean');
   await text.fill('Changed isolated text');
   await page.waitForFunction(()=>document.querySelector('[data-testid=dirty]').textContent==='dirty');
   const colors=await text.evaluate(el=>{const s=getComputedStyle(el);return {color:s.color,bg:s.backgroundColor,foreground:s.getPropertyValue('--foreground'),rootForeground:getComputedStyle(document.documentElement).getPropertyValue('--foreground')};});
   assert.equal(colors.foreground,colors.rootForeground);
   assert.notEqual(colors.color,colors.bg);
   assert.deepEqual(errors,[]);
   results.push({theme,node,dirty:true,colors,errors});await page.close();
  }
  console.log(JSON.stringify({passed:results.length,results},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
