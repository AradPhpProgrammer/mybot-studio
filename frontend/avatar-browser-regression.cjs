// Real modal, intercepted API/media only; Vite must already be running.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const lang of ['en','fa','ar','ru']){
 const t=p=>p.split('.').reduce((v,k)=>v[k],require(`./src/locales/${lang}.json`));
 const page=await browser.newPage({viewport:{width:1000,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let bot={id:987654,telegram_bot_id:12345678,name:'DISPLAY NAME MUST NOT BE PHOTO',username:'verified_fixture_bot',settings:{photo_url:'/media/broken.png'}};
 let uploads=0;
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;let data={};
 if(p==='/api/bots')data=[bot];
 else if(p.endsWith('/database-schema'))data={};
 else if(p.endsWith('/avatar')){uploads++;bot={...bot,settings:{photo_url:'/media/avatar.png'}};data={status:'ok',photo_url:'/media/avatar.png',telegram_synced:true};}
 else if(p.startsWith('/api/flows/'))data={nodes:[],edges:[]};
 else if(p.endsWith('/catalog'))data=[];
 await r.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await page.route('**/media/**',async r=>{if(r.request().url().endsWith('broken.png'))return r.fulfill({status:404,body:''});await r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5uQAAAAASUVORK5CYII=','base64')});});
 await page.addInitScript(({bot,lang})=>{localStorage.setItem('mybot_token','TEST_FIXTURE');localStorage.setItem('mybot_view','studio');localStorage.setItem('mybot_current_bot_id',String(bot.id));localStorage.setItem('mybot_current_bot',JSON.stringify(bot));localStorage.setItem('mybot_lang',lang);},{bot,lang});
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 const open=async()=>{await page.mouse.move(500,2);await page.getByRole('button',{name:t('navbar.bot_settings'),exact:true}).click();await page.locator('#bot-username').waitFor();};
 await open();await page.waitForTimeout(200);
 const dialog=page.getByRole('dialog');
 await page.waitForFunction(()=>document.querySelector('[role=dialog] img')?.naturalWidth>0);
 assert.ok((await dialog.locator('img').getAttribute('src')).endsWith('default-bot.png'),'broken avatar uses the default image');
 assert.equal(await page.locator('#bot-username').getAttribute('readonly'),'');
 assert.equal(await page.locator('#bot-telegram-id').inputValue(),'12345678');
 assert.equal(await page.locator('#bot-telegram-id').getAttribute('readonly'),'');
 assert.equal(await page.locator('p#bot-username-hint').count(),0);
 await page.locator('#bot-display-name').fill('Another display name');
 await dialog.locator('input[type=file][accept="image/*"]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('fixture')});
 await dialog.locator('img').waitFor();
 await page.waitForFunction(()=>document.querySelector('[role=dialog] img')?.naturalWidth>0);
 assert.equal(await dialog.locator('img').getAttribute('alt'),'');
 assert.ok((await dialog.textContent()).includes(t('bot_settings.tracked_fields.profile_photo_desc')));
 await dialog.getByRole('button',{name:t('common.close'),exact:true}).click();await open();
 assert.ok(await dialog.locator('img').isVisible());assert.equal(uploads,1);assert.deepEqual(errors,[]);
 console.log(`${lang}: immutable Telegram ID/username, no paragraph, broken image default fallback, Telegram-success fixture upload/reopen PASS`);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
