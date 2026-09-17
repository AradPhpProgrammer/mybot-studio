const {chromium}=require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const theme of ['dark','light']) {
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 const bot={id:987654,name:'Fixture',settings:{}};
 const flow={nodes:[{id:'send',type:'action_send_message',position:{x:0,y:0},data:{text:'Short'}},{id:'kb',type:'action_keyboard',position:{x:450,y:0},data:{buttons:[],keyboard_type:'inline'}}],edges:[{id:'link',source:'send',target:'kb',sourceHandle:'exec',targetHandle:'exec'}]};
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({json:p==='/api/bots'?[bot]:p.startsWith('/api/flows/')?flow:p.endsWith('/catalog')?[]:{}})});
 await page.addInitScript(({bot,theme})=>{for(const[k,v]of Object.entries({mybot_token:'F',mybot_view:'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_theme:theme,mybot_lang:'en'}))localStorage.setItem(k,v)},{bot,theme});
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 const n=page.locator('.react-flow__node[data-id="send"]');await n.waitFor();
 await n.locator('[data-node-collapse]').click();
 const geometry=()=>n.evaluate(n=>{const b=n.querySelector('.node-fold-summary').getBoundingClientRect();return{width:b.width,handles:[...n.querySelectorAll('.react-flow__handle')].map(h=>{const r=h.getBoundingClientRect();return {x:r.x+r.width/2-b.x,y:r.y+r.height/2-b.y}}),height:b.height}});
 const before=await geometry();
 await page.mouse.move(700,700);await page.mouse.down({button:'middle'});await page.mouse.move(700,-1800,{steps:30});await page.mouse.up({button:'middle'});await page.waitForTimeout(600);
 assert.equal(await n.count(),0,'pan actually unmounts node');
 await page.mouse.move(700,300);await page.mouse.down({button:'middle'});await page.mouse.move(700,2800,{steps:30});await page.mouse.up({button:'middle'});await n.waitFor();await page.waitForTimeout(400);
 const after=await geometry();
 console.log(theme,{before,after});
 assert.ok(Math.abs(before.width-after.width)<2,'fold width survives viewport culling');
 for(const h of after.handles){assert.ok(Math.min(Math.abs(h.x),Math.abs(h.x-after.width))<4,'handle on card side');assert.ok(h.y>=0&&h.y<=after.height,'handle within card height');}
 assert.equal(await page.locator('.react-flow__edge[data-id="link"]').count(),1);
 await page.reload();await n.waitFor();await page.waitForTimeout(300);
 assert.ok(Math.abs((await geometry()).width-before.width)<2,'fold width survives reload');
 console.log('PASS fold pan and reload',theme);await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
