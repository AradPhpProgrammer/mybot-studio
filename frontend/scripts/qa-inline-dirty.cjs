// Inline keyboard dirty/undo regression with isolated API fixtures. No user DB writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bot={id:987654,name:'QA inline',username:'qa_inline',is_active:false,settings:{enable_user_database:true}};
 const flow={nodes:[{id:'send',type:'action_send_message',position:{x:80,y:100},data:{text:'QA'}},{id:'kb',type:'action_keyboard',position:{x:440,y:100},data:{keyboard_type:'inline',buttons:[[{text:'Home',callback_data:'home',style:'primary'}]]}}],edges:[{id:'link',source:'send',target:'kb',sourceHandle:'exec',targetHandle:'exec'}]};
 let saved=null;
 await page.route('**/api/**',route=>{
  const p=new URL(route.request().url()).pathname;
  if(p==='/api/bots') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([bot])});
  if(p==='/api/flows/987654'){
   if(route.request().method()==='POST'){saved=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(flow)});
  }
  if(p.endsWith('/database-schema')) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({tracked_fields:['custom_variables'],fields:[]})});
  return route.fulfill({status:200,contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(bot=>{
  for(const [k,v] of Object.entries({mybot_token:'QA_FIXTURE_NOT_A_CREDENTIAL',mybot_view:'studio',mybot_current_bot_id:String(bot.id),mybot_current_bot:JSON.stringify(bot),mybot_lang:'en',mybot_theme:'dark'})) localStorage.setItem(k,v);
 },bot);
 await page.goto('http://127.0.0.1:5173');
 await page.waitForTimeout(200);
 const kb=page.locator('.react-flow__node[data-id="kb"]');
 await kb.waitFor();
 // Click keyboard node then add a second row; dirty flag must appear.
 await kb.click();
 const addRow=page.locator('.telegram-mockup').getByRole('button',{name:'Add row',exact:true});
 await addRow.click();
 await page.getByText('Unsaved changes',{exact:true}).waitFor({state:'attached'});
 // Undo once removes the new row.
 await page.keyboard.press('Control+z');
 const restored=flow.nodes.find(n=>n.id==='kb');
 await kb.waitFor();
 const buttons=await kb.locator('[data-keyboard-editor]').evaluate(el=>el.querySelectorAll('input').length);
 console.log(JSON.stringify({buttons,saved:saved?.nodes?.find(n=>n.id==='kb')?.data,dirtyBeforeUndo:true,afterUndoButtons:buttons,errors}));
 await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/sync-commands')),
  page.keyboard.press('Control+Shift+s'),
 ]);
 assert.ok(saved!==null);
 assert.deepEqual(saved.nodes.find(n=>n.id==='kb').data.buttons,restored.data.buttons);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: inline keyboard dirty track and Ctrl+Z undo verified.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
