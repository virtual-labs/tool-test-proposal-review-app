import {test,expect} from '@playwright/test';
async function login(page,email){await page.request.post('/__test/clear-limits');await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('proposal controls and column headers follow page scrolling and release at the table end',async({page,request})=>{
 await request.post('/__test/reset?many=true');await login(page,'admin@example.com');
 await page.getByRole('button',{name:/^Pending Proposals/}).click();
 const region=page.locator('.proposal-region'),tools=region.locator('.proposal-sticky-tools'),table=region.getByRole('table'),head=table.locator('thead');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await region.evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top+450));
  await expect.poll(async()=>Math.round((await tools.boundingBox()).y)).toBe(0);
  await expect.poll(async()=>Math.abs((await head.boundingBox()).y-((await tools.boundingBox()).y+(await tools.boundingBox()).height))).toBeLessThan(2);
  const wrap=region.locator('.table-wrap');await wrap.evaluate(e=>{e.scrollLeft=150;});
  const h=await head.locator('[data-column="Proposal ID"]').boundingBox(),cell=await table.locator('tbody tr').first().locator('[data-column="Proposal ID"]').boundingBox();expect(Math.abs(h.x-cell.x)).toBeLessThan(2);
  await expect(tools.getByRole('heading',{name:'Pending Proposals'})).toBeVisible();await expect(tools.getByRole('combobox',{name:'Set'})).toBeVisible();
  await page.screenshot({path:`test-results/sticky-proposals-${width}.png`});
 }
 await page.getByRole('heading',{name:'Reviewer Progress',exact:true}).scrollIntoViewIfNeeded();
 expect((await tools.boundingBox()).y+(await tools.boundingBox()).height).toBeLessThanOrEqual((await region.boundingBox()).y+(await region.boundingBox()).height+2);
});
test('Admin and PIC progress footers total the displayed rows',async({page,request})=>{
 await request.post('/__test/reset');
 for(const email of ['admin@example.com','ldc@example.com']){
  await login(page,email);if(email.startsWith('ldc'))await page.locator('#roleSelector').selectOption('PIC');
  for(const name of ['Domain progress','Reviewer progress']){
   const table=page.getByRole('table',{name,exact:true});await expect(table.locator('tfoot')).toContainText('Total');
   const values=await table.evaluate(t=>{const start=t.getAttribute('aria-label')==='Domain progress'?1:2;return {sums:[...t.tBodies[0].rows].reduce((s,r)=>{[...r.cells].slice(start).forEach((c,i)=>s[i]=(s[i]||0)+Number(c.textContent));return s;},[]),totals:[...t.tFoot.rows[0].cells].slice(1).map(c=>Number(c.textContent))};});expect(values.totals).toEqual(values.sums);
  }
  await page.locator('#logoutBtn').click();
 }
});
