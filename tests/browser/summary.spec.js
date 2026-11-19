import {test,expect} from '@playwright/test';
async function login(page,email){await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('all roles can view both summary tables and filter by set on desktop and mobile',async({page,request})=>{
 for(const [email,role] of [['admin@example.com','Admin'],['ldc@example.com','LDC'],['ldc@example.com','PIC'],['assistant@example.com','Assistant Reviewer']]){
  await request.post('/__test/reset?sets=true');await login(page,email);
  if(role==='PIC')await page.locator('#roleSelector').selectOption('PIC');
  await page.locator('#summaryBtn').click();
  const domain=page.getByRole('table',{name:'Domain-wise Summary'}),institutes=page.getByRole('table',{name:'Institute-wise Summary'});
  await expect(page.getByRole('combobox',{name:'Set',exact:true})).toHaveCount(2);
  for(const heading of await page.locator('.summary-table-heading').all()){
    const title=await heading.locator('h2').boundingBox(),filter=await heading.getByRole('combobox').boundingBox();expect(filter.x).toBeGreaterThan(title.x+title.width);expect(Math.abs(filter.y-title.y)).toBeLessThan(12);
  }
  for(const wrap of await page.locator('#summaryPage .table-wrap').all())expect(await wrap.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/compact-summary.png',fullPage:true});
  await expect(domain.locator('tbody tr')).toHaveCount(1);await expect(institutes.locator('tbody tr')).toHaveCount(2);
  await expect(domain).toContainText('incomplete: 1');
  for(const table of [domain,institutes]){
    await expect(table.locator('tfoot th')).toHaveText('Total');
    await expect(table.locator('tfoot td')).toHaveText(['2','4 (incomplete: 1 lab(s) missing a valid count)','0','2','0','0']);
    await table.getByRole('button',{name:/^Proposals/}).click();
    await expect(table.locator('tfoot tr')).toHaveCount(1);
  }
  await page.getByRole('combobox',{name:'Set',exact:true}).first().selectOption('A');await expect(institutes.locator('tbody tr')).toHaveCount(1);await expect(domain).not.toContainText('incomplete:');
  for(const table of [domain,institutes])await expect(table.locator('tfoot td')).toHaveText(['1','4','0','1','0','0']);
  await expect(page.getByRole('combobox',{name:'Set',exact:true}).last()).toHaveValue('A');
  await page.getByRole('combobox',{name:'Set',exact:true}).last().selectOption('');await expect(institutes.locator('tbody tr')).toHaveCount(2);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:900});
  await page.locator('#logoutBtn').click();
 }
});
