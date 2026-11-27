import {test,expect} from '@playwright/test';
async function login(page,email='ldc@example.com'){await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test('LDC submits Yes/No selections and the filtered Domain card reflects saved choices',async({page,request})=>{
 await request.post('/__test/reset?sets=true');await login(page);
 await page.getByRole('button',{name:'Start Review',exact:true}).click();
 for(const field of ['clarity','academicRelevance','pedagogicalNeed','quality','experimentDesign','jobRelevance','userExperience','overallRating'])await page.locator('#'+field).selectOption('5');
 page.once('dialog',d=>d.accept());await page.locator('#submitBtn').click();await expect(page.locator('#notice')).toContainText('submitted successfully');
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 await page.getByRole('button',{name:'View Review',exact:true}).click();await expect(page.locator('#viewPage p').filter({has:page.locator('strong').filter({hasText:'Selected:'})})).toHaveText('Selected:');await page.locator('#viewBackBtn').click();await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 const selected=page.getByRole('combobox',{name:'Selected for A_P1',exact:true});
 await expect(page.getByRole('columnheader',{name:'Selected',exact:true})).toHaveCount(0);await expect(page.getByRole('columnheader',{name:'Remarks',exact:true})).toHaveCount(0);
 const cards=await page.locator('#dashboardPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(cards).toHaveLength(5);expect(new Set(cards).size).toBe(1);
 const selectAll=await page.getByRole('button',{name:'Select All',exact:true}).boundingBox(),setBox=await page.getByRole('combobox',{name:'Set',exact:true}).boundingBox();expect(setBox.x).toBeGreaterThan(selectAll.x+selectAll.width);expect(Math.abs(setBox.y-selectAll.y)).toBeLessThan(8);
 await page.screenshot({path:'test-results/compact-workspace.png',fullPage:true});
 await page.locator('#selectionBtn').click();await expect(selected).toHaveValue('-');
 const tabs=await page.locator('#appNav button[id$="Btn"]').evaluateAll(nodes=>nodes.map(n=>n.id).filter(id=>id!=='refreshBtn'));expect(tabs.indexOf('selectionBtn')).toBeLessThan(tabs.indexOf('domainBtn'));if(tabs.includes('assistantBtn'))expect(tabs.at(-1)).toBe('assistantBtn');
 await page.locator('tbody [data-column="Remarks"] button').click();await page.getByRole('dialog').getByRole('textbox').fill('Recommended for selection');await page.getByRole('dialog').getByRole('button',{name:'Submit',exact:true}).click();await selected.selectOption('Yes');await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
 await expect(selected).toHaveValue('Yes');
 await page.getByRole('button',{name:'View Review',exact:true}).click();await expect(page.locator('#viewPage')).toContainText('Selected: Yes');for(const label of ['Review ID:','Reviewer:','Rank:','Rank Justification:','Selected:']){const heading=page.locator('#viewPage strong').filter({hasText:new RegExp('^'+label+'\\s*$')});await expect(heading).toHaveCount(1);expect(Number(await heading.evaluate(e=>getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(600);}await expect(page.locator('#viewPage')).toContainText('Recommended for selection');await page.locator('#viewBackBtn').click();
 await page.locator('#summaryBtn').click();
 for(const table of ['Domain-wise Summary','Institute-wise Summary']){
  const total=page.getByRole('table',{name:table}).locator('tfoot');await expect(total.locator('td').nth(4)).toHaveText('1');await expect(total.locator('td').nth(5)).toHaveText('4');
 }
 await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('A_P1');
 const domainTable=page.getByRole('table',{name:'Proposals',exact:true});
 await expect(domainTable.getByRole('columnheader',{name:'Submitted on'})).toHaveCount(1);
 await expect(domainTable.locator('tbody [data-column="Experiments"]')).toHaveText('4');
 await expect(domainTable.locator('tfoot td').first()).toHaveText('4');
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 await expect(domainTable.locator('tbody [data-column="Selected"]')).toHaveText('Yes');
 await expect(domainTable.getByRole('combobox',{name:/Selected for/})).toHaveCount(0);
 await page.getByRole('button',{name:/^Selected Proposals/}).click();
 await domainTable.locator('tbody [data-column="Remarks"] button').click();await expect(page.getByRole('dialog')).toContainText('Recommended for selection');await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await expect(domainTable.getByRole('button',{name:'View Review',exact:true})).toHaveCount(0);
 const domainCards=await page.locator('#domainPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(domainCards).toHaveLength(5);expect(new Set(domainCards).size).toBe(1);
 await page.screenshot({path:'test-results/compact-domain.png',fullPage:true});
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
 await expect(domainTable.locator('tfoot td').first()).toHaveText('0');
 await page.locator('#selectionBtn').click();await expect(selected).toHaveValue('Yes');
 await page.locator('#domainBtn').click();await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('');await page.locator('#selectionBtn').click();
 for(const value of ['On Hold','-']){
  await selected.selectOption(value);await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
  await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Reviewed Proposals/}).click();await expect(domainTable.locator('tbody [data-column="Selected"]')).toHaveText(value);
  await page.locator('#selectionBtn').click();await expect(selected).toHaveValue(value);
 }
 await selected.selectOption('No');await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
 await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
});

test('Admin selected card is read-only and its compact Set filter preserves the active card',async({page,request})=>{
 await request.post('/__test/reset?sets=true');await login(page);
 const saved=await page.evaluate(async()=>{
  const call=async(action,data)=>(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args:['cookie',data]})})).json();
  const submitted=await call('submitReview',{proposalId:'A_P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:5});
  if(!submitted.ok)return submitted;
  return call('saveProposalSelections',{selections:[{id:'A_P1',selected:'Yes',expectedSelected:'-',version:''}]});
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
 await expect(page.locator('#selectionBtn')).toHaveCount(0);await expect(page.locator('#selectionPage')).toHaveCount(0);await expect(page.getByRole('button',{name:'Submit Selections'})).toHaveCount(0);
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();
 const status=page.getByRole('combobox',{name:'Selection Status',exact:true});await expect(status.locator('option')).toHaveText(['All','Selected','Not Selected','On Hold']);await expect(table.locator('tbody [data-column="Selected"]')).toHaveText('Yes');
 await status.selectOption('No');await expect(table.locator('tbody tr')).toHaveCount(0);await status.selectOption('On Hold');await expect(table.locator('tbody tr')).toHaveCount(0);await status.selectOption('Yes');await expect(table).toContainText('A_P1');
 await page.getByRole('button',{name:/^Pending Proposals/}).click();await expect(status).toHaveCount(0);await expect(table.getByRole('columnheader',{name:'Selected',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^Reviewed Proposals/}).click();await page.locator('#refreshBtn').click();await expect(status).toHaveValue('');await expect(page.getByRole('button',{name:/^Reviewed Proposals/})).toHaveAttribute('aria-pressed','true');
 await status.selectOption('No');await page.reload();await expect(status).toHaveValue('');
 await page.locator('#reviewerDashboardBtn').click();const reviewers=page.getByRole('table',{name:'Reviewer progress'});await expect(reviewers.locator('thead th')).toHaveText(['Reviewer ↑','Domain ↕','Assigned ↕','Pending ↕','Reviewed ↕','Ranked ↕','Selected ↕','Not Selected ↕','On Hold ↕']);const names=await reviewers.locator('tbody [data-column="Reviewer"]').allTextContents();expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b)));
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

 test('PIC selected table has the requested columns and read-only remarks',async({page,request})=>{
 await request.post('/__test/reset?sets=true');await login(page);
 const saved=await page.evaluate(async()=>{
  const call=async(action,data)=>(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args:['cookie',data]})})).json();
  await call('submitReview',{proposalId:'A_P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:5});
  return call('saveProposalSelections',{selections:[{id:'A_P1',selected:'Yes',expectedSelected:'-',version:'',remarks:'Ready',expectedRemarks:''}]});
 });expect(saved.ok).toBe(true);
 await page.locator('#selectionBtn').click();await expect(page.locator('#selectionPage')).toContainText('A_P1');await expect(page.getByRole('columnheader',{name:'Submitted on'})).toHaveCount(0);await expect(page.getByRole('columnheader',{name:'Overall Score'})).toHaveCount(1);
 await page.locator('#roleSelector').selectOption('PIC');await page.getByRole('button',{name:/^Selected Proposals/}).click();
 const table=page.getByRole('table',{name:'Proposals',exact:true});
 expect(await table.locator('thead th').evaluateAll(nodes=>nodes.map(n=>n.dataset.column))).toEqual(['S.No.','Proposal ID','Proposal Name','Experiments','Action','Rank','Justification','Selected','Remarks','Submitted on']);
 await table.locator('tbody [data-column="Remarks"] button').click();await expect(page.getByRole('dialog')).toContainText('Ready');await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await expect(table.getByRole('columnheader',{name:'Overall Score'})).toHaveCount(0);
 await expect(table.getByRole('textbox')).toHaveCount(0);await expect(page.getByRole('button',{name:'Submit Selections'})).toHaveCount(0);
 await expect(page.locator('#selectionBtn')).toHaveCount(0);
 await table.getByRole('button',{name:'View Review',exact:true}).click();await expect(page.locator('#viewPage')).toBeVisible();
 });
