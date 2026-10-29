// Approved role guides ported from the Apps Script interface, with current PIC wording.
export const roleGuides={
  "Assistant Reviewer": [
    "Open Assigned Proposals to see only your assignments.",
    "Read the proposal and existing lab links, then complete the review form. Save as Draft moves your work to Draft Proposals, where Resume Draft lets you continue.",
    "Click Submit to LDC to hand your answers to the LDC. You cannot edit after handoff. An existing LDC draft blocks handoff to protect their work.",
    "Open Submitted to LDC and select View Submitted Review to read your original answers. View Final Review becomes available after the LDC finalises the review."
  ],
  "LDC": [
    "In My Rank Dashboard, use Add or View/Edit in the Justification column to enter an explanation for a proposal. Submit blank text to remove it. Justifications are visible in ranking views and review PDFs. Click Save Rankings to save both ranks and justification.",
    "If you have assistant assignments, open My Assistant Reviewers Dashboard to track them. Review Draft opens the assistant’s submitted answers as your draft. Check and edit them before submitting your final review.",
    "In My Workspace, open a card to see your pending assignments, saved drafts or submitted reviews. Click Start Review, Resume Draft or View Review to open a proposal.",
    "Read the proposal document and check any Existing Lab Links provided when reviewing the proposal. These links point to related labs already hosted on the Virtual Labs portal and can help you understand the existing work relevant to the proposed lab.",
    "You can save an incomplete review as a draft and return later. Saving reserves the proposal for you, so the other reviewer cannot continue it. To submit the final review, answer all eight rating questions from 1 to 6. Comments are optional. A submitted review cannot be edited.",
    "In My Rank Dashboard, rank only proposals in your domain whose final review you submitted. Newly submitted reviews remain unranked. Click Generate Rankings to assign and save ranks by overall score descending, then Proposal ID ascending, replacing existing ranks. You can modify these ranks manually and save them. Rank 1 is the highest priority. Each LDC has a separate ranking list. Saved manual changes are retained.",
    "Ranks are editable. Click Save Rankings to save your ranks and justification changes. You cannot change another reviewer's rankings.",
    "Open Domain Dashboard to monitor review completion, rankings by each reviewer and pending assignments across your domain. Other reviewers’ assessment details are private. If you also have the PIC role, save your changes before switching with Active Role.",
    "To download your own reviews, use My Workspace → Reviewed Proposals or My Rank Dashboard. Select the checkboxes and click Download Selected Reviews. Each review downloads as a separate PDF. If your browser blocks multiple downloads, use the individual filename links provided.",
    "Save your changes before clicking Refresh or leaving the page. For assistance, email support@vlabs.ac.in or manager.iitdelhi@gmail.com."
  ],
  "Admin": [
    "Navigate in this order: Review Dashboard, Proposal Dashboard, Rank Dashboard, User Dashboard. Proposal Dashboard lists all proposals with Status, Institute and Domain filters. Pending includes proposals with saved drafts. Select View Proposal to open its document; Clear filters restores all proposals.",
    "User Dashboard contains one read-only Users & roles table. Filter by Domain, Institutes, Roles or Active/Inactive Status; Clear filters restores all users. Domain shows Not applicable for Admins and the configured domain for LDC and Assistant Reviewer users, including PIC/LDC dual-role users. User changes are managed in the Google Sheet.",
    "In Review Dashboard, select Reviewed Proposals or Pending Proposals. Pending includes proposals with saved drafts.",
    "Use Domain, Institute and Reviewer to narrow the results. Select Clear filters to restore the full list. Domain Progress and Reviewer Progress summarise the filtered results.",
    "Select View Review to read a submitted review. Draft answers are private and are not displayed in the monitoring dashboards.",
    "In Rank Dashboard, select Ranked Proposals to view saved ranks or Unranked Proposals to view reviewed proposals awaiting a rank. Use View Review or View Proposal to read the supporting material.",
    "Each reviewer ranks only proposals whose final review they submitted, using a separate list. Different reviewers may use the same rank numbers. Rank Dashboard is for monitoring; manage users and proposal assignments in the Google Sheet.",
    "Download submitted reviews from the monitoring or ranking lists: select the checkboxes and choose Download Selected Reviews. Each selection is a separate PDF. View Review also provides the proposal link and Download Review PDF. Allow multiple downloads if prompted, or use the individual filename links provided.",
    "Select Refresh to load the latest data and Sign out when you finish. For assistance, email support@vlabs.ac.in or manager.iitdelhi@gmail.com."
  ],
  "PIC": [
    "Sign in with your registered email address and the latest verification code. If you also have the LDC role, select PIC from Active Role.",
    "PIC Dashboard displays proposals for your configured institute. Select Reviewed Proposals or Pending Proposals to display the relevant list.",
    "Use Domain and Status to narrow the results. Select Clear filters to restore the full list. Institute and Reviewer filters are not shown.",
    "Select View Review to read submitted ratings and comments. Draft answers remain private.",
    "In Rank Dashboard, open Ranked Proposals or Unranked Proposals to view your institute's reviewed proposals. Each reviewer has a separate ranking list. Rank / Reviewer Total shows the saved rank against that person's reviewed proposals in the domain, including any from other institutes.",
    "PIC dashboards are for monitoring. If you also have the LDC role, switch to LDC to review assigned proposals or rank proposals whose final review you submitted. Save your changes before switching roles.",
    "Download your institute's submitted reviews from either dashboard: select the checkboxes and choose Download Selected Reviews. Each selection is a separate PDF. View Review also provides the proposal link and Download Review PDF. Allow multiple downloads if prompted, or use the individual filename links provided.",
    "Select Refresh to load the latest data and Sign out when you finish. For assistance, email support@vlabs.ac.in or manager.iitdelhi@gmail.com."
  ]
};
