// Real App browser QA; every API request is fulfilled locally, never forwarded.
// Run: node scripts/qa-canvas-interactions.cjs [mobile|desktop]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.QA_OUTPUT || path.join(require('node:os').tmpdir(), 'mybot-canvas-qa');
fs.mkdirSync(out, {recursive:true});
const results=[];
const fixture = () => ({nodes:[
 {id:'send',type:'action_send_message',position:{x:0,y:40},data:{text:'Baseline message'}},
 {id:'delay',type:'action_delay',position:{x:0,y:370},data:{seconds:2}},
 {id:'kb',type:'action_keyboard',position:{x:440,y:40},data:{keyboard_type:'inline',buttons:[[{text:'A',callback_data:'a',style:'primary'},{text:'B',callback_data:'b',style:'success'}],[{text:'C',callback_data:'c',style:'danger'}]]}}
],edges:[
 {id:'valid',source:'send',target:'delay',sourceHandle:'exec',targetHandle:'exec'},
 {id:'invalid',source:'delay',target:'kb',sourceHandle:'exec',targetHandle:'exec',style:{stroke:'#00ff00'}}
]});
async function setup(browser,{width=1600,height=1100,theme='light',lang='en'}={}) {
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<500});
 const page=await context.newPage(); page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const messages=require(`../src/locales/${lang}.json`),t=k=>k.split('.').reduce((v,k)=>v[k],messages);
 const bot={id:987654,name:'Isolated canvas QA',username:'qa_fixture',is_active:false,settings:{enable_user_database:true}};
 let flow=fixture();const saves=[],requests=[];
 await page.route('**/api/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;requests.push({method:req.method(),path:p});
  let data={};
  if(p==='/api/bots')data=[bot];
  else if(p==='/api/flows/987654') {if(req.method()==='POST'){flow=req.postDataJSON();saves.push(structuredClone(flow));}data=flow;}
  else if(p==='/api/fonts'||p.endsWith('/catalog'))data=[];
  else if(p.endsWith('/database-schema'))data={tracked_fields:['custom_variables'],fields:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(({bot,lang,theme})=>{for(const[k,v]of Object.entries({mybot_token:'QA_FIXTURE_NOT_A_CREDENTIAL',mybot_view:'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_lang:lang,mybot_theme:theme}))localStorage.setItem(k,v)}, {bot,lang,theme});
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 await page.locator('.react-flow__node[data-id="kb"]').waitFor();
 await page.waitForTimeout(500);
 const panel=page.locator('.telegram-mockup');
 if(await panel.count())await panel.getByTitle(t('common.minimize'),{exact:true}).click();
 const save=async()=>{await page.waitForTimeout(150);const count=saves.length;await page.keyboard.press('Control+Shift+s');for(let i=0;i<100&&saves.length===count;i++)await page.waitForTimeout(20);assert.equal(saves.length,count+1);await page.waitForTimeout(150);return structuredClone(saves.at(-1));};
 return {context,page,errors,t,save,requests};
}
const node = (page,id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const matrix = page => page.locator('.react-flow__viewport').evaluate(el=>{const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);return{x:m.e,y:m.f,zoom:m.a}});
const pointToFlow=async(page,p)=>{const m=await matrix(page),r=await page.locator('.react-flow').boundingBox();return{x:(p.x-r.x-m.x)/m.zoom,y:(p.y-r.y-m.y)/m.zoom}};
const nearly=(actual,expected,label)=>{assert.ok(Math.abs(actual.x-expected.x)<1&&Math.abs(actual.y-expected.y)<1,`${label}: ${JSON.stringify({actual,expected})}`)};
async function desktop(browser,theme,lang) {
 const {page,context,errors,t,save,requests}=await setup(browser,{theme,lang});
 const result={theme,lang,checks:[],metrics:{}};results.push(result);
 try {
  assert.equal(await page.locator('.react-flow').evaluate((el,theme)=>el.classList.contains(theme),theme),true);
  const edge=page.locator('.react-flow__edge[data-id="invalid"] .react-flow__edge-path');
  const edgeColors=await edge.evaluate(el=>{const s=getComputedStyle(el),probe=document.createElement('span');probe.style.color='var(--danger)';el.parentElement.append(probe);const danger=getComputedStyle(probe).color;probe.remove();return{stroke:s.stroke,danger,dash:s.strokeDasharray}});
  assert.equal(edgeColors.stroke,edgeColors.danger);assert.notEqual(edgeColors.dash,'none');
  assert.notEqual(await page.locator('.react-flow__edge[data-id="valid"] .react-flow__edge-path').evaluate(el=>getComputedStyle(el).stroke),edgeColors.stroke);
  await node(page,'kb').getByText(t('nodes.action_keyboard.must_follow_message'),{exact:true}).waitFor();
  result.checks.push('invalid predecessor edge overrides persisted green with danger red + localized warning');result.metrics.edgeColors=edgeColors;
  // Exercise actual zoom controls and pointer pan, then insert via each context-menu path.
  await page.locator('.react-flow__controls-zoomout').click();
  await page.waitForTimeout(250);
  const freePoint=()=>page.evaluate(()=>{for(let y=innerHeight-180;y>210;y-=80)for(let x=innerWidth-220;x>260;x-=80){if(document.elementFromPoint(x,y)?.classList.contains('react-flow__pane'))return{x,y};}throw new Error('No empty canvas point');});
  const pan=await freePoint(),beforePan=await matrix(page);
  await page.mouse.move(pan.x,pan.y);await page.mouse.down();await page.mouse.move(pan.x+60,pan.y+30,{steps:12});await page.mouse.up();
  assert.notEqual((await matrix(page)).x,beforePan.x,'actual viewport pan');
  const viewport=await matrix(page);assert.notEqual(viewport.zoom,1);result.metrics.viewport=viewport;
  for(const kind of ['pane','node','edge']){
   let p;
   if(kind==='pane')p=await freePoint();
   else if(kind==='node'){const b=await node(page,'send').locator('.custom-drag-handle').boundingBox();p={x:b.x+b.width/2,y:b.y+b.height/2};}
   else p=await page.locator('.react-flow__edge[data-id="valid"] .react-flow__edge-path').evaluate(el=>{const q=el.getPointAtLength(el.getTotalLength()/2),m=el.getScreenCTM();return{x:q.x*m.a+q.y*m.c+m.e,y:q.x*m.b+q.y*m.d+m.f}});
   const expected=await pointToFlow(page,p);
   await page.mouse.click(p.x,p.y,{button:'right'});
   if(kind!=='pane')await page.getByRole('button',{name:t('canvas.add_node_here'),exact:true}).filter({hasText:t('canvas.add_node_here')}).click();
   const search=page.getByPlaceholder(t('common.search'),{exact:true});await search.waitFor();await search.fill('action_delay');await search.press('Enter');
   const snapshot=await save(),added=snapshot.nodes.find(n=>!['send','delay','kb'].includes(n.id));assert.ok(added);nearly(added.position,expected,kind);
   result.checks.push(`${kind} right-click insertion at exact flow cursor after zoom/pan`);
   await page.keyboard.press('Control+z');await page.waitForTimeout(80);assert.equal(await node(page,added.id).count(),0);
   // Selection of insertion opens inspector; leave viewport unobstructed.
   if(await page.locator('.telegram-mockup').count())await page.locator('.telegram-mockup').getByTitle(t('common.minimize'),{exact:true}).click();
  }
  // Preceding text transaction proves a multi-frame drag consumes exactly one undo.
  const text=node(page,'send').locator('textarea');await text.fill('Prior transaction');await text.blur();
  const before=(await save()).nodes.find(n=>n.id==='send').position;
  const h=await node(page,'send').locator('.custom-drag-handle').boundingBox();
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+115,h.y+h.height/2+65,{steps:20});await page.mouse.up();
  const after=(await save()).nodes.find(n=>n.id==='send').position;assert.notDeepEqual(after,before);
  await page.keyboard.press('Control+z');const once=await save();assert.deepEqual(once.nodes.find(n=>n.id==='send').position,before);assert.equal(once.nodes.find(n=>n.id==='send').data.text,'Prior transaction');
  await page.keyboard.press('Control+z');const twice=await save();assert.equal(twice.nodes.find(n=>n.id==='send').data.text,'Baseline message');
  result.checks.push('20-step pointer node drag is exactly one undo transaction');result.metrics.drag={before,after};
  if(await page.locator('.telegram-mockup').count())await page.locator('.telegram-mockup').getByTitle(t('common.minimize'),{exact:true}).click();
  await page.locator('.react-flow__controls-fitview').click();await page.waitForTimeout(350);
  for(let i=0;i<3;i++){await page.locator('.react-flow__controls-zoomout').click();await page.waitForTimeout(250);}
  const editor=node(page,'kb').locator('[data-keyboard-editor]');
  await editor.waitFor();
  const labels=()=>editor.locator('input[aria-label]').evaluateAll(els=>els.map(el=>el.value));
  for(const mode of ['inline','reply']) {
   await editor.locator('select').selectOption(mode);
   assert.equal(await editor.locator('input[list]').count(),mode==='inline'?1:0);
   const colors=await editor.evaluate(el=>({surface:getComputedStyle(el).backgroundColor,header:getComputedStyle(el.firstElementChild).backgroundColor,foreground:getComputedStyle(el).color,mode:getComputedStyle(el.querySelector('select')).color}));
   assert.notEqual(colors.surface,colors.header);
   for(const color of [colors.foreground,colors.mode]){
    const channels=color.match(/[\d.]+/g).slice(0,3).map(Number);
    assert.ok(color.startsWith('oklch') ? (theme==='dark'?channels[0]>0.8:channels[0]<0.4) : channels.every(v=>theme==='dark'?v>180:v<100),JSON.stringify(colors));
   }
   result.metrics[mode+'Colors']=colors;
   if(await page.locator('.telegram-mockup').count())await page.locator('.telegram-mockup').getByTitle(t('common.minimize'),{exact:true}).click();
   const handles=editor.locator('button[draggable="true"]');
   await handles.nth(0).scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   const b=await handles.nth(1).locator('..').boundingBox();
   await handles.nth(0).dragTo(handles.nth(1).locator('..'),{targetPosition:{x:b.width-3,y:b.height/2}});
   assert.deepEqual(await labels(),['B','A','C']);
   let snapshot=await save();assert.deepEqual(snapshot.nodes.find(n=>n.id==='kb').data.buttons.map(row=>row.map(b=>b.text)),[['B','A'],['C']]);
   // Move A from first row to end of second row by genuine HTML5 drag.
   const c=await handles.nth(2).locator('..').boundingBox();
   await handles.nth(1).dragTo(handles.nth(2).locator('..'),{targetPosition:{x:c.width-3,y:c.height/2}});
   snapshot=await save();assert.deepEqual(snapshot.nodes.find(n=>n.id==='kb').data.buttons.map(row=>row.map(b=>b.text)),[['B'],['C','A']]);
   const originalStyles=Object.fromEntries(snapshot.nodes.find(n=>n.id==='kb').data.buttons.flat().map(b=>[b.text,b.style]));assert.deepEqual(originalStyles,{B:'success',C:'danger',A:'primary'});
   await page.screenshot({path:path.join(out,`${theme}-${lang}-${mode}-keyboard.png`)});
   await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');assert.deepEqual(await labels(),['A','B','C']);
   result.checks.push(`${mode}: pointer drag within/across rows preserves colors, two undos restore layout; theme tokens readable`);
  }
  assert.deepEqual(errors,[]);result.status='passed';result.requests=requests;
 } catch(error){result.status='failed';result.error=error.stack;await page.screenshot({path:path.join(out,`${theme}-${lang}-failure.png`)});throw error;}finally{await context.close();}
}
async function mobile(browser,theme,lang) {
 const {context,page,errors,t,save}=await setup(browser,{width:390,height:844,theme,lang});
 const result={theme,lang,mobile:true,checks:[]};results.push(result);
 try {
  const add=page.locator('.react-flow').getByRole('button',{name:t('canvas.add_node_here'),exact:true});
  assert.equal(await add.count(),1,'Touch canvas must expose a visible add-node control without right click or hardware keyboard');
  const box=await add.boundingBox();assert.ok(box.width>=44&&box.height>=44,JSON.stringify(box));assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);
  await add.tap();const search=page.getByPlaceholder(t('common.search'),{exact:true});await search.waitFor();await search.fill('action_delay');
  await page.getByText(t('nodes.action_delay.name'),{exact:true}).last().tap();
  const snapshot=await save();assert.equal(snapshot.nodes.length,4);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`mobile-${theme}-${lang}-add.png`)});
  result.status='passed';result.checks.push('visible translated 44px touch add control opens palette and inserts a node');
 }catch(error){result.status='failed';result.error=error.stack;await page.screenshot({path:path.join(out,`mobile-${theme}-${lang}-failure.png`)});throw error;}finally{await context.close();}
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 if(process.argv[2]!=='mobile')for(const [theme,lang]of[['light','en'],['dark','fa']])await desktop(browser,theme,lang);
 if(process.argv[2]!=='desktop')for(const [theme,lang]of[['light','en'],['dark','fa']])await mobile(browser,theme,lang);
 console.log(JSON.stringify({passed:true,results,output:out},null,2));
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
