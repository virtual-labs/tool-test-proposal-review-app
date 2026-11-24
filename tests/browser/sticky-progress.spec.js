import {test,expect} from '@playwright/test';
async function login(page,email){await page.request.post('/__test/clear-limits');await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('proposal controls and column headers follow page scrolling and release at the table end',async({page,request})=>{
 await request.post('/__test/reset?many=true');await login(page,'admin@example.com');
 await page.getByRole('button',{name:/^Pending Proposals/}).click();
 const region=page.getByRole('table',{name:'Proposals',exact:true}).locator('xpath=ancestor::div[contains(@class,"proposal-region")][1]'),tools=region.locator('.proposal-sticky-tools'),table=region.getByRole('table'),head=table.locator('thead');
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

test('ranking titles, controls and headers stay aligned while scrolling for LDC, Admin and PIC',async({page,request})=>{
 await request.post('/__test/reset');
 const rows=Array.from({length:40},(_,i)=>({id:`A_${i+1}`,name:`Lab ${i+1}`,downloadable:true,rank:i+1,reviewer:'Reviewer',reviewerTotal:40,domain:'CSE',institute:'IIT',overallScore:35}));
 await page.route('**/api',async route=>{
  const action=route.request().postDataJSON()?.action;
  if(action==='getRankingData')return route.fulfill({json:{ok:true,result:{version:'sticky',proposalSetVersion:'sticky',saved:rows.map(r=>({id:r.id,rank:r.rank})),proposals:rows}}});
  if(action==='getAdminRankings')return route.fulfill({json:{ok:true,result:{rows,unrankedRows:rows.map(r=>({...r,rank:null})),filterOptions:{}}}});
  return route.continue();
 });
 for(const role of ['LDC','Admin','PIC']){
  await login(page,role==='Admin'?'admin@example.com':'ldc@example.com');if(role==='PIC')await page.locator('#roleSelector').selectOption('PIC');await page.locator('#rankingBtn').click();
  const region=page.locator('#rankingPage .proposal-region'),tools=region.locator('.proposal-sticky-tools'),table=region.getByRole('table');
  await expect(table.locator('tbody tr')).toHaveCount(40);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await region.evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top+600));
   await expect.poll(async()=>Math.round((await tools.boundingBox()).y)).toBe(0);
   await expect.poll(async()=>Math.abs((await table.locator('thead').boundingBox()).y-(await tools.boundingBox()).height)).toBeLessThan(2);
   await tools.getByRole('button',{name:'Select All',exact:true}).click();await expect(table.locator('tbody input:checked')).toHaveCount(40);
   await tools.getByRole('button',{name:'Clear',exact:true}).click();await expect(table.locator('tbody input:checked')).toHaveCount(0);
   await region.locator('.table-wrap').evaluate(e=>e.scrollLeft=120);
   const h=await table.locator('thead [data-column="Proposal ID"]').boundingBox(),c=await table.locator('tbody [data-column="Proposal ID"]').first().boundingBox();expect(Math.abs(h.x-c.x)).toBeLessThan(2);
   await page.screenshot({path:`test-results/sticky-ranking-${role}-${width}.png`});
  }
  await page.locator('#logoutBtn').click();
 }
});

test('all roles get sticky summary headings and every visible table opts in',async({page,request})=>{
 const rows=Array.from({length:40},(_,i)=>({name:`Group ${i+1}`,labs:1,experiments:4,reviewed:0,pending:1,selectedLabs:0,selectedExperiments:0}));
 await page.route('**/api',async route=>route.request().postDataJSON()?.action==='getSummaryData'?route.fulfill({json:{ok:true,result:{domains:rows,institutes:rows}}}):route.continue());
 for(const role of ['Admin','LDC','PIC','Assistant Reviewer']){
  await request.post('/__test/reset?many=true');await login(page,role==='Admin'?'admin@example.com':role==='Assistant Reviewer'?'assistant@example.com':'ldc@example.com');if(role==='PIC')await page.locator('#roleSelector').selectOption('PIC');
  await expect(page.locator('table').first()).toBeVisible();expect(await page.locator('table').evaluateAll(t=>t.every(e=>e.parentElement.classList.contains('page-sticky-table')))).toBe(true);
  if(role==='Admin')for(const id of ['usersBtn','proposalDashboardBtn']){await page.locator('#'+id).click();await expect(page.locator('.page-sticky-table table')).toBeVisible();}
  await page.locator('#summaryBtn').click();await expect(page.getByRole('table',{name:'Domain-wise Summary'}).locator('tbody tr')).toHaveCount(40);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   for(const label of ['Domain-wise Summary','Institute-wise Summary']){
    const table=page.getByRole('table',{name:label}),region=table.locator('xpath=ancestor::section[1]'),toolbar=region.locator('.proposal-sticky-tools');
    await table.evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top+500));
    await expect.poll(async()=>Math.round((await toolbar.boundingBox()).y)).toBe(0);
    await expect.poll(async()=>Math.abs((await table.locator('thead').boundingBox()).y-(await toolbar.boundingBox()).height)).toBeLessThan(2);
    await expect(toolbar.getByRole('combobox',{name:'Set'})).toBeVisible();
    await table.locator('..').evaluate(e=>e.scrollLeft=150);
    const h=await table.locator('thead th').nth(2).boundingBox(),c=await table.locator('tbody tr').first().locator('td').nth(2).boundingBox();expect(Math.abs(h.x-c.x)).toBeLessThan(2);
   }
  }
 }
});
