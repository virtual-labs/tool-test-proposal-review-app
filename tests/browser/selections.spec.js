import {test,expect} from '@playwright/test';
async function login(page){await page.goto('/');await page.locator('#email').fill('ldc@example.com');await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email=ldc%40example.com')).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
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
 const domainCards=await page.locator('#domainPage .stat').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(domainCards).toHaveLength(4);expect(new Set(domainCards).size).toBe(1);
 await page.screenshot({path:'test-results/compact-domain.png',fullPage:true});
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
 await page.locator('#workspaceBtn').click();await page.getByRole('button',{name:/^Reviewed Proposals/}).click();await expect(selected).toHaveValue('Yes');
 await selected.selectOption('No');await page.getByRole('button',{name:'Submit Selections',exact:true}).click();await expect(page.locator('#notice')).toContainText('Proposal selections saved');
 await page.locator('#domainBtn').click();await page.getByRole('button',{name:/^Selected Proposals/}).click();await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
});
