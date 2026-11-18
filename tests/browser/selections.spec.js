import {test,expect} from '@playwright/test';
async function login(page,email='ldc@example.com'){await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('LDC submits Yes/No selections and the filtered Domain card reflects saved choices',async({page,request})=>{
 await request.post('/__test/reset?sets=true');await login(page);
 await page.getByRole('button',{name:'Start Review',exact:true}).click();
 for(const field of ['clarity','academicRelevance','pedagogicalNeed','quality','experimentDesign','jobRelevance','userExperience','overallRating'])await page.locator('#'+field).selectOption('5');
 page.once('dialog',d=>d.accept());await page.locator('#submitBtn').click();await expect(page.locator('#notice')).toContainText('submitted successfully');
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 const selected=page.getByRole('combobox',{name:'Selected for A_P1',exact:true});
 await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('th').last()).toHaveText('Selected');await expect(selected).toHaveValue('No');
 const cards=await page.locator('#dashboardPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(cards).toHaveLength(4);expect(new Set(cards).size).toBe(1);
 const selectAll=await page.getByRole('button',{name:'Select All',exact:true}).boundingBox(),setBox=await page.getByRole('combobox',{name:'Set',exact:true}).boundingBox();expect(setBox.x).toBeGreaterThan(selectAll.x+selectAll.width);expect(Math.abs(setBox.y-selectAll.y)).toBeLessThan(8);
 await page.screenshot({path:'test-results/compact-workspace.png',fullPage:true});
 await selected.selectOption('Yes');await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
 await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('A_P1');
 await page.locator('#summaryBtn').click();
 for(const table of ['Domain-wise Summary','Institute-wise Summary']){
  const total=page.getByRole('table',{name:table}).locator('tfoot');await expect(total.locator('td').nth(4)).toHaveText('1');await expect(total.locator('td').nth(5)).toHaveText('4');
 }
 await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('A_P1');
 const domainTable=page.getByRole('table',{name:'Proposals',exact:true});
 await expect(domainTable.getByRole('columnheader',{name:'Submitted on'})).toHaveCount(0);
 await expect(domainTable.locator('tbody [data-column="Number of Experiments"]')).toHaveText('4');
 await expect(domainTable.locator('tfoot td')).toHaveText('4');
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 await expect(domainTable.locator('tbody [data-column="Selected"]')).toHaveText('Yes');
 await expect(domainTable.getByRole('combobox',{name:/Selected for/})).toHaveCount(0);
 await page.getByRole('button',{name:/^Selected Proposals/}).click();
 const domainCards=await page.locator('#domainPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(domainCards).toHaveLength(4);expect(new Set(domainCards).size).toBe(1);
 await page.screenshot({path:'test-results/compact-domain.png',fullPage:true});
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
 await expect(domainTable.locator('tfoot td')).toHaveText('0');
 await page.locator('#workspaceBtn').click();await page.getByRole('button',{name:/^Reviewed Proposals/}).click();await expect(selected).toHaveValue('Yes');
 await selected.selectOption('No');await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
 await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
});

test('Admin selected card is read-only and its compact Set filter preserves the active card',async({page,request})=>{
 await request.post('/__test/reset?sets=true');await login(page);
 const saved=await page.evaluate(async()=>{
  const call=async(action,data)=>(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args:['cookie',data]})})).json();
  const submitted=await call('submitReview',{proposalId:'A_P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:5});
  if(!submitted.ok)return submitted;
  return call('saveProposalSelections',{selections:[{id:'A_P1',selected:'Yes',expectedSelected:'No',version:''}]});
 });expect(saved.ok).toBe(true);
 await page.locator('#logoutBtn').click();await login(page,'admin@example.com');
 await page.getByRole('button',{name:/^Selected Proposals/}).click();
 const table=page.getByRole('table',{name:'Proposals',exact:true});await expect(table).toContainText('A_P1');
 await expect(page.getByRole('button',{name:'Submit Selections',exact:true})).toHaveCount(0);
 await expect(page.getByRole('combobox',{name:/Selected for/})).toHaveCount(0);
 await expect(page.locator('#adminFilterPanel').getByRole('combobox',{name:'Set',exact:true})).toHaveCount(0);
 const filter=page.getByRole('combobox',{name:'Set',exact:true}),selectAll=await page.getByRole('button',{name:'Select All',exact:true}).boundingBox(),box=await filter.boundingBox();expect(box.x).toBeGreaterThan(selectAll.x+selectAll.width);expect(Math.abs(box.y-selectAll.y)).toBeLessThan(8);
 const cards=await page.locator('#adminPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(cards).toHaveLength(3);expect(new Set(cards).size).toBe(1);
 await filter.selectOption('B');await expect(page.getByRole('button',{name:/^Selected Proposals/})).toHaveAttribute('aria-pressed','true');await expect(table.locator('tbody tr')).toHaveCount(0);
 await filter.selectOption('A');await expect(table).toContainText('A_P1');
 await page.getByRole('combobox',{name:'Institute',exact:true}).selectOption('other institute');await expect(table.locator('tbody tr')).toHaveCount(0);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(filter).toHaveValue('');await expect(table).toContainText('A_P1');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
