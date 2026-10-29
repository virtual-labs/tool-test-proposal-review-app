import {test,expect} from '@playwright/test';

test.beforeEach(async({request})=>{await request.post('/__test/reset');});
async function login(page,email){
  await page.goto('/');await page.locator('#email').fill(email);
  const requestResponse=page.waitForResponse(response=>response.url().endsWith('/api')&&response.request().postDataJSON()?.action==='requestOtp');
  await page.locator('#sendBtn').click();const response=await requestResponse;const payload=await response.json();expect(payload.result.code).toBeUndefined();
  await expect(page.locator('#otpForm')).toBeVisible();
  const mailbox=await (await page.request.get(`/__test/mailbox?email=${encodeURIComponent(email)}`)).json();
  await page.locator('#otp').fill(mailbox.code);await page.locator('#verifyBtn').click();
  await expect(page.locator('#appNav')).toBeVisible();
}

test('React OTP login, drafts, final review, manual and automatic rankings, PDF, PIC role and session restoration',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await login(page,'ldc@example.com');await expect(page.locator('#dashboardPage')).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await page.getByRole('button',{name:'Start Review',exact:true}).click();await expect(page.locator('#reviewPage')).toBeVisible();
  for(const field of ['clarity','academicRelevance','pedagogicalNeed','quality','experimentDesign','jobRelevance','userExperience','overallRating'])await page.locator(`#${field}`).selectOption('5');
  await page.locator('#reviewerComments').fill('Browser-tested React review');await page.locator('#saveDraftBtn').click();
  await expect(page.locator('#notice')).toContainText('Draft saved');await page.getByRole('button',{name:/Saved Draft Proposals/}).click();
  await page.getByRole('button',{name:'Resume Draft',exact:true}).click();await expect(page.locator('#reviewerComments')).toHaveValue('Browser-tested React review');
  await page.locator('#submitBtn').click();await expect(page.locator('#notice')).toContainText('submitted successfully');
  await page.locator('#rankingBtn').click();await expect(page.locator('#rankingPage')).toBeVisible();
  await page.getByRole('combobox',{name:'Rank for Test Lab',exact:true}).selectOption('1');
  await page.getByRole('textbox',{name:'Justification for Test Lab',exact:true}).fill('Clear academic value');
  await page.locator('#submitRanksBottom').click();await expect(page.getByText('Your rankings have been saved.',{exact:true})).toBeVisible();
  await page.locator('#autoRankProposalsBtn').click();await expect(page.getByText('Rankings generated and saved.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View Review',exact:true}).click();await expect(page.locator('#viewPage')).toBeVisible();
  await expect(page.getByText('Rank Justification: Clear academic value',{exact:true})).toBeVisible();await expect(page.locator('#downloadViewedReview')).toHaveCount(0);
  await page.locator('#viewBackBtn').click();await page.getByRole('checkbox',{name:'Select review P1',exact:true}).check();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download Selected Reviews',exact:true}).click();expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/);
  await page.reload();await expect(page.locator('#dashboardPage')).toBeVisible();await page.locator('#roleSelector').selectOption('PIC');await expect(page.locator('#adminTitle')).toHaveText('PIC Dashboard');
  await page.locator('#logoutBtn').click();await expect(page.locator('#loginCard')).toBeVisible();expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/react-otp-login.png',fullPage:true});
});

test('admin directories, filters, sorting and mobile layout run as React components',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await login(page,'admin@example.com');await expect(page.locator('#adminPage')).toBeVisible();
  for(const [button,target] of [['proposalDashboardBtn','proposalDashboardPage'],['usersBtn','usersPage'],['rankingBtn','rankingPage'],['adminBtn','adminPage']]){
    await page.locator(`#${button}`).click();await expect(page.locator(`#${target}`)).toBeVisible();
  }
  await page.locator('#usersBtn').click();await expect(page.getByRole('table',{name:'Users & roles',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('ldc');
  await expect(page.getByRole('table',{name:'Users & roles',exact:true})).toContainText('Reviewer (ldc@example.com)');
  await expect(page.getByRole('table',{name:'Users & roles',exact:true})).not.toContainText('Admin (admin@example.com)');
  await page.getByRole('button',{name:/User Name/}).click();await expect(page.locator('th[aria-sort=ascending]')).toHaveCount(1);
  await page.locator('#adminBtn').click();await expect(page.getByRole('table',{name:'Proposals',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/react-admin-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/react-admin-mobile.png',fullPage:true});expect(errors).toEqual([]);
});

test('assistant saves and hands off a review to the LDC',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await login(page,'assistant@example.com');
  await expect(page.locator('#dashboardTitle')).toHaveText('Assistant Reviewer Dashboard');await expect(page.locator('#rankingBtn')).toHaveCount(0);await expect(page.locator('#usersBtn')).toHaveCount(0);
  await page.getByRole('button',{name:'Start Review',exact:true}).click();
  for(const field of ['clarity','academicRelevance','pedagogicalNeed','quality','experimentDesign','jobRelevance','userExperience','overallRating'])await page.locator(`#${field}`).selectOption('4');
  await page.locator('#submitBtn').click();await expect(page.locator('#notice')).toContainText('submitted to the LDC');
  await page.getByRole('button',{name:/Submitted to LDC/}).click();await page.getByRole('button',{name:'View Submitted Review',exact:true}).click();
  await expect(page.locator('#viewPage')).toBeVisible();expect(errors).toEqual([]);
});

test('invalid OTP stays on the form, resend cooldown is visible and email is not a password login',async({page})=>{
  await page.goto('/');await page.locator('#email').fill('ldc@example.com');await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();
  await expect(page.locator('#sendBtn')).toBeDisabled();const mailbox=await (await page.request.get('/__test/mailbox?email=ldc%40example.com')).json();
  await page.locator('#otp').fill(mailbox.code==='000000'?'000001':'000000');await page.locator('#verifyBtn').click();
  await expect(page.getByRole('alert')).toContainText('Invalid or expired');await expect(page.locator('#otpForm')).toBeVisible();
  await page.locator('#otp').fill(mailbox.code);await page.locator('#verifyBtn').click();await expect(page.locator('#dashboardPage')).toBeVisible();
});

test('unsaved review survives session expiry in memory and is recoverable only after signing in again',async({page})=>{
  await login(page,'ldc@example.com');await page.getByRole('button',{name:'Start Review',exact:true}).click();await page.locator('#reviewerComments').fill('Keep this unsaved comment');
  await page.request.post('/__test/expire');page.once('dialog',dialog=>dialog.accept());await page.locator('#saveDraftBtn').click();
  await expect(page.locator('#loginCard')).toBeVisible();
  await page.request.post('/__test/reset');await page.locator('#email').fill('ldc@example.com');await page.locator('#sendBtn').click();await expect(page.locator('#otpForm')).toBeVisible();
  const mailbox=await (await page.request.get('/__test/mailbox?email=ldc%40example.com')).json();await page.locator('#otp').fill(mailbox.code);await page.locator('#verifyBtn').click();
  await page.getByRole('button',{name:'Restore unsaved work',exact:true}).click();await expect(page.locator('#reviewerComments')).toHaveValue('Keep this unsaved comment');
});
