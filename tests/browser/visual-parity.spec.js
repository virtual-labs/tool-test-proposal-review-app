import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const source=readFileSync('../src/appscript/index.html','utf8');
const referenceCss=source.match(/<style>([\s\S]*?)<\/style>/)[1];
async function login(page,email){await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('original portal visual tokens and all role screens at desktop and mobile widths',async({page,request,context})=>{
 test.setTimeout(180000);
 await request.post('/__test/reset');
 const reference=await context.newPage();await reference.setContent(`<style>${referenceCss}</style><main><div class="dashboard-intro"><h2>Dashboard</h2></div><button class="secondary compact">Navigation</button><div class="stat red"><strong>1</strong></div></main>`);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await reference.setViewportSize({width,height:1000});
  await page.bringToFront();await page.goto('/');await expect(page.locator('#loginCard')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family',await reference.locator('body').evaluate(e=>getComputedStyle(e).fontFamily));
  await expect(page.locator('body')).toHaveCSS('color',await reference.locator('body').evaluate(e=>getComputedStyle(e).color));
  await page.screenshot({path:`test-results/ui-login-${width}.png`,fullPage:true});
  for(const [email,role] of [['ldc@example.com','ldc'],['admin@example.com','admin'],['assistant@example.com','assistant']]){
   await request.post('/__test/clear-limits');await login(page,email);
   await expect(page.locator('.dashboard-intro h2').first()).toHaveCSS('font-size',await reference.locator('h2').evaluate(e=>getComputedStyle(e).fontSize));
   if(width===390)expect((await page.locator('.brand-copy').boundingBox()).width).toBeGreaterThan(200);
   await expect(page.locator('#appNav button').first()).toHaveCSS('padding','8px 14px');
   for(const nav of await page.locator('#appNav button:not(#refreshBtn)').all()){
    await nav.click();await expect(page.getByRole('status').filter({hasText:/Loading/})).toHaveCount(0);
    const id=await nav.getAttribute('id');await page.screenshot({path:`test-results/ui-${role}-${id}-${width}.png`,fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   }
   if(role==='ldc'){
    await page.locator('#workspaceBtn').click();await page.getByRole('button',{name:'Start Review',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Proposal Review Form'})).toBeVisible();await page.screenshot({path:`test-results/ui-form-${width}.png`,fullPage:true});await page.locator('#backBtn').click();
    await page.locator('#roleSelector').selectOption('PIC');await expect(page.locator('#adminTitle')).toHaveText('PIC Dashboard');await page.screenshot({path:`test-results/ui-pic-${width}.png`,fullPage:true});await page.locator('#rankingBtn').click();await expect(page.locator('#adminRankingArea')).toBeVisible();await page.screenshot({path:`test-results/ui-pic-ranks-${width}.png`,fullPage:true});
   }
   await page.locator('#logoutBtn').click();await expect(page.locator('#loginCard')).toBeVisible();
  }
 }
 await reference.close();
});
