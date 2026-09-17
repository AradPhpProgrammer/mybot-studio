// Fresh browser storage; all backend requests intercepted, no real credentials/data.
const {chromium}=require('C:/Users/ARAD/AppData/Local/Temp/mybot-browser-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const [lang,theme,width] of [['en','light',1400],['fa','dark',390]]){
 const page=await browser.newPage({viewport:{width,height:950},hasTouch:width<500});page.setDefaultTimeout(10000);
 const tr=require(`../src/locales/${lang}.json`),t=k=>k.split('.').reduce((v,k)=>v[k],tr);
 let loginCount=0,createCount=0,bots=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async r=>{const req=r.request(),p=new URL(req.url()).pathname;let data={},status=200;
 if(p==='/api/auth/login'){loginCount++;if(loginCount===1){status=401;data={detail:'Isolated login rejection'};}else data={access_token:'TEST_FIXTURE',admin_secret_path:''};}
 else if(p==='/api/bots'&&req.method()==='POST'){createCount++;assert.equal(req.postDataJSON().token,'ISOLATED_TEST_TOKEN');const bot={id:987654,telegram_bot_id:456789,name:'New fixture bot',username:'new_fixture',photo_url:'/default-bot.png',telegram_photo_synced:true,settings:{}};bots=[bot];data={success:true,bot};}
 else if(p==='/api/bots')data=bots;
 else if(p.startsWith('/api/flows/'))data=p.endsWith('/catalog')?[]:{nodes:[],edges:[]};
 else if(p.endsWith('/fonts'))data=[];
 await r.fulfill({status,json:data});});
 await page.addInitScript(({lang,theme})=>{localStorage.setItem('mybot_lang',lang);localStorage.setItem('mybot_theme',theme)},{lang,theme});
 await page.goto(process.env.MYBOT_QA_URL || 'http://127.0.0.1:23568');
 await page.locator('input[type=text]').fill('isolated-user');await page.locator('input[type=password]').fill('isolated-password');
 await page.getByRole('button',{name:t('login.login_btn'),exact:true}).click();await page.getByText('Isolated login rejection',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('mybot_token')),null);
 await page.getByRole('button',{name:t('login.login_btn'),exact:true}).click();await page.getByText(t('dashboard.no_profiles_title'),{exact:true}).waitFor();
 await page.getByTitle(t('dashboard.create_bot_btn'),{exact:true}).click();await page.getByPlaceholder(t('dashboard.token_placeholder'),{exact:true}).fill('ISOLATED_TEST_TOKEN');await page.getByRole('button',{name:t('common.confirm'),exact:true}).click();
 await page.getByText(t('dashboard.bot_verified'),{exact:true}).waitFor();assert.equal(createCount,1);await page.getByRole('button',{name:t('dashboard.open_studio'),exact:true}).last().click();await page.locator('.react-flow').waitFor();assert.deepEqual(errors,[]);console.log('PASS new-user login failure/success, empty dashboard, create/open bot',lang,theme,width);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
