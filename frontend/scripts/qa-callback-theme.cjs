// Isolated browser regression: fixture API responses, never writes user data.
const { chromium } = require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const bot={id:987654,name:'QA fixture',username:'qa_fixture',settings:{},is_active:false};
  const flow={nodes:[{id:'alert',type:'action_answer_callback',position:{x:100,y:100},data:{text:'QA alert',show_alert:false}}],edges:[]};
  await page.route('**/api/**', route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path==='/api/bots'?[bot]:path==='/api/flows/987654'?flow:path==='/api/fonts'?[]:{};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(bot=>{
    localStorage.setItem('mybot_token','qa-fixture-not-a-credential');
    localStorage.setItem('mybot_current_bot',JSON.stringify(bot));
    localStorage.setItem('mybot_current_bot_id',String(bot.id));
    localStorage.setItem('mybot_view','studio');
    localStorage.setItem('mybot_lang','en');
    localStorage.setItem('mybot_theme','dark');
  },bot);
  await page.goto('http://127.0.0.1:5173');
  const label=page.locator('.react-flow__node-action_answer_callback label').filter({has:page.locator('input[type=checkbox]')});
  await label.waitFor();
  const result=await label.evaluate(el=>{
    const rows=[]; for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);rows.push({tag:p.tagName,classes:p.className,color:s.color,bg:s.backgroundColor,fg:s.getPropertyValue('--foreground'),surface:s.getPropertyValue('--surface')});}
    return {text:el.textContent,chain:rows};
  });
  console.log(JSON.stringify(result,null,2));
  assert.equal(await page.locator('.react-flow').evaluate(el=>el.classList.contains('dark')), true, 'ReactFlow must use the selected dark theme, not a nested light override');
  assert.equal(result.chain[0].fg, result.chain.at(-1).fg, 'callback label must inherit root dark theme foreground');
  assert.match(result.chain[0].color, /oklch\(0\.9/, 'callback text remains bright on the dark surface');
  assert.notEqual(result.chain[0].surface, 'oklch(100% 0 0)');
  console.log('Dark theme tokens verified against document root.');

  await label.locator('input').check();
  assert.equal(await label.locator('input').isChecked(),true);
  await label.locator('input').press('Control+z');
  assert.equal(await label.locator('input').isChecked(),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'C:/Users/ARAD/AppData/Local/Temp/mybot-callback-dark.png'});
  console.log('PASS: real ActionNode checkbox toggle + graph undo; fixture backend; no runtime errors.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
