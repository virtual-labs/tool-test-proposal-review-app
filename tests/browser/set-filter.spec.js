import {test,expect} from '@playwright/test';
async function login(page,email){await page.goto('/');await page.locator('#email').fill(email);await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();const {code}=await(await page.request.get('/__test/mailbox?email='+encodeURIComponent(email))).json();await page.locator('#otp').fill(code);await page.locator('#verifyBtn').click();await expect(page.locator('#appNav')).toBeVisible();}
test.beforeEach(async({request})=>{await request.post('/__test/reset?sets=true');});
test('Admin set filters narrow cards, progress and directory; User Dashboard stays unchanged',async({page})=>{
 await login(page,'admin@example.com');
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('A');
 await expect(page.getByRole('button',{name:/Pending Proposals/})).toContainText('1 / 1');
 await page.getByRole('button',{name:/Pending Proposals/}).click();
 await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('A_P1');
 await expect(page.getByRole('table',{name:'Proposals',exact:true})).not.toContainText('B_P2');
 await page.locator('#reviewerDashboardBtn').click();await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');
 await expect(page.getByRole('table',{name:'Reviewer progress'}).locator('tbody tr')).toHaveCount(1);
 await expect(page.getByRole('table',{name:'Reviewer progress'}).locator('tbody')).toContainText('Other');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByRole('table',{name:'Reviewer progress'}).locator('tbody')).toContainText('Reviewer');
 await page.locator('#rankingBtn').click();await expect(page.getByRole('combobox',{name:'Set',exact:true})).toBeVisible();
 await page.locator('#usersBtn').click();await expect(page.getByRole('combobox',{name:'Set',exact:true})).toHaveCount(0);
});
test('LDC and assistant proposal dashboards expose Set and clear it without changing data',async({page})=>{
 await login(page,'ldc@example.com');
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');await expect(page.getByRole('table',{name:'Proposals',exact:true}).locator('tbody tr')).toHaveCount(0);
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('');await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('A_P1');
 for(const id of ['domainBtn','assistantBtn','rankingBtn']){await page.locator('#'+id).click();await expect(page.getByRole('combobox',{name:'Set',exact:true})).toBeVisible();}
 await page.locator('#logoutBtn').click();await login(page,'assistant@example.com');await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('B');await expect(page.getByRole('table',{name:'Assistant proposals'}).locator('tbody tr')).toHaveCount(0);
});

test('ranking edits survive filtering and save both sets without renumbering',async({page,request})=>{
 await request.post('/__test/reset?sets=true&own=true');await login(page,'ldc@example.com');
 for(const id of ['A_P1','B_P2']){
  const result=await page.evaluate(async id=>{
   const answers={proposalId:id,draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:6,reviewerComments:''};
   return (await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submitReview',args:['cookie',answers]})})).json();
  },id);expect(result.ok).toBe(true);
 }
 await page.locator('#rankingBtn').click();
 const set=page.getByRole('combobox',{name:'Set',exact:true});
 await set.selectOption('A');await page.getByRole('combobox',{name:'Rank for Test Lab',exact:true}).selectOption('1');
 await set.selectOption('B');await page.getByRole('combobox',{name:'Rank for Other Lab',exact:true}).selectOption('1');
 await page.locator('#submitRanksBottom').click();await expect(page.getByRole('status').filter({hasText:'Your rankings have been saved.'})).toBeVisible();
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption('');
 await expect(page.getByRole('combobox',{name:'Rank for Test Lab',exact:true})).toHaveValue('1');await expect(page.getByRole('combobox',{name:'Rank for Other Lab',exact:true})).toHaveValue('1');
 await page.locator('#refreshBtn').click();await expect(page.getByRole('combobox',{name:'Rank for Test Lab',exact:true})).toHaveValue('1');await expect(page.getByRole('combobox',{name:'Rank for Other Lab',exact:true})).toHaveValue('1');
});

test('Review Dashboard domain narrows dependent options and clears incompatible choices',async({page,request})=>{
 await request.post('/__test/reset?domains=true');await login(page,'admin@example.com');
 const domain=page.getByRole('combobox',{name:'Domain',exact:true}),institute=page.getByRole('combobox',{name:'Institute',exact:true}),reviewer=page.getByRole('combobox',{name:'Reviewer',exact:true});
 await expect(page.getByRole('button',{name:/^Reviewed Proposals/})).toHaveAttribute('aria-pressed','true');
 await institute.selectOption('iit');await reviewer.selectOption('reviewer');await domain.selectOption('cse');
 await expect(institute).toHaveValue('iit');await expect(reviewer).toHaveValue('reviewer');
 await expect(institute.locator('option')).toHaveText(['All institutes','IIT']);await expect(reviewer.locator('option')).toHaveText(['All reviewers','Reviewer']);
 await domain.selectOption('ece');await expect(institute).toHaveValue('');await expect(reviewer).toHaveValue('');
 await expect(institute.locator('option')).toHaveText(['All institutes','Other Institute']);await expect(reviewer.locator('option')).toHaveText(['All reviewers','Other']);
 await expect(page.getByRole('table',{name:'Proposals',exact:true})).toContainText('Other Lab');
 await page.reload();await expect(domain).toHaveValue('ece');await expect(institute.locator('option')).toHaveText(['All institutes','Other Institute']);
 await domain.selectOption('');await expect(institute.locator('option')).toHaveText(['All institutes','IIT','Other Institute']);await expect(reviewer.locator('option')).toHaveText(['All reviewers','Other','Reviewer']);
 await domain.selectOption('cse');await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(domain).toHaveValue('');await expect(institute.locator('option')).toHaveCount(3);
});
