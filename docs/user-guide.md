# User Guide

Reviewed against the application source on 5 November 2026.

## 1. About the portal

The Virtual Labs Proposal Review portal is a shared workspace for reviewing lab proposals, submitting assessments, prioritising reviewed proposals and monitoring progress. The screens available to you depend on your assigned role.

| Role | Main responsibilities |
|---|---|
| LDC | Review assigned proposals, submit final assessments and rank personal completed reviews. |
| Assistant Reviewer | Prepare assessments and hand them to an assigned LDC. |
| PIC | Monitor proposals and submitted reviews for the configured institute. |
| Admin | Monitor proposals, reviews, rankings and user assignments across the portal. |

## 2. Sign in and navigate

1. Open the portal URL supplied by your administrator.
2. Enter your registered email address and request a verification code.
3. Check your inbox and spam folder. Enter the latest six-digit OTP within ten minutes.
4. If needed, wait for the 60-second resend cooldown before requesting another code. A replacement invalidates the previous code; each code can be used once and allows at most five attempts.
5. After signing in, use the navigation tabs for your role. If you have both PIC and LDC access, save your work before switching **Active Role**.

Only registered, active accounts can sign in. There is no password registration or password-reset workflow. Sessions last two hours; switching roles does not extend the session.

Use **Help** for assistance and **User Guide** for the in-app role instructions. Use **Refresh** to reload data after saving. Select **Sign out** when finished.

## 3. Shared controls and review details

- Select a summary card to display its associated list. Filters narrow results; **Clear filters** restores the filter selections. Card counts can describe the filtered set rather than all records.
- Use sortable table headings where available. Wide tables can scroll horizontally on smaller screens.
- **View Proposal** opens the proposal document. **Existing Lab Links**, when supplied, provide relevant existing labs.
- **View Review** opens a submitted assessment you are authorised to see. It includes the reviewer name, numbered evaluation criteria, recorded ratings and comments. An assistant name is shown separately when available. Showing names does not grant access to otherwise private reviews.
- Saved drafts use **Updated on**. Completed proposal lists use **Submitted on**. Pending lists omit the date column. Recognised dates show the full formatted timestamp on hover, in Indian Standard Time at minute precision.
- Submitted final reviews are read-only. Private draft answers are not exposed in monitoring dashboards.

## 4. LDC guide

### Review and submit proposals

1. Open **My Workspace**, then the pending proposals card.
2. Choose **Start Review** for an available assignment.
3. Read the proposal and any existing lab links.
4. Complete the eight rating questions using values from 1 to 6. Comments are optional.
5. Use **Save as Draft** to save incomplete work. Continue from **Saved Draft Proposals** using **Resume Draft**. Saving a draft reserves the proposal for you, preventing the other assigned reviewer from continuing it.
6. Check all answers before submitting the final review. Submitted reviews cannot be edited through the portal.
7. Use **Reviewed Proposals** and **View Review** to inspect the saved assessment.

A confirmation email may follow submission. If email delivery fails, the saved review remains valid; check the portal before attempting another submission.

### Work with assistant reviewers

When assistant assignments exist, open **My Assistant Reviewers Dashboard** to monitor them. **Review Draft** opens an assistant's handed-off answers as your draft. Review and edit those answers before submitting the final assessment. You remain responsible for the final review.

### Rank completed reviews

1. Open **My Rank Dashboard** and read **Ranking Guidelines**.
2. Rank only the proposals whose final review you submitted in your domain. New completed reviews remain unranked until ranks are saved or generated.
3. Enter ranks manually, with **1** as the highest priority. Avoid duplicate ranks within the same set in your list.
4. Alternatively, select **Generate Rankings**. This replaces and saves ranks using overall score descending, then Proposal ID ascending to break ties. The score totals the first seven criteria, out of 42; the eighth overall rating is separate.
5. Use **Add** or **View/Edit** in Justification to explain a rank. **Submit** in the dialog stages the text; **Save Rankings** persists both ranks and justifications. Cancel or Escape discards dialog edits. Submit blank justification text and save to remove it.
6. Save manual changes with **Save Rankings**. You can also clear all ranks using the available removal control.

Each reviewer has an independent ranking list within each domain and set, so different reviewers can use the same rank numbers. You cannot edit another reviewer's rankings. In ascending rank order, unranked entries appear first.

### Monitor the domain and download reviews

**Domain Dashboard** shows Reviewed, Pending and Ranked proposals across your domain. Pending includes saved drafts. It has no Saved Draft card or Action column; other reviewers' assessment details remain private.

To download your own completed reviews, select checkboxes in **My Workspace → Reviewed Proposals** or **My Rank Dashboard**, then choose **Download Selected Reviews**.

## 5. Assistant Reviewer guide

1. Open **Assigned Proposals** to view your assignments.
2. Read the proposal and existing lab links, then fill in the assessment.
3. Select **Save as Draft** to save incomplete work. Open **Draft Proposals → Resume Draft** to continue.
4. When ready, select **Submit to LDC**. You cannot edit the assessment after handoff. Handoff is blocked if an LDC draft already exists, protecting the LDC's work; contact the LDC to coordinate.
5. Under **Submitted to LDC**, select **View Submitted Review** to read your original answers.
6. After the LDC finalises the assessment, use **View Final Review** to read it. Final-review access is view-only for assistants; PDF download is unavailable.

Assistant handoff is not the final review submission. The LDC checks the answers and submits the final assessment.

## 6. PIC guide

### Monitor institute proposals

1. Open **PIC Dashboard**. If you also have LDC access, first select PIC under **Active Role**.
2. Choose **Reviewed Proposals** or **Pending Proposals**. Pending includes saved drafts, without exposing their answers.
3. Filter using **Domain** and **Status**. Institute and Reviewer filters are not shown because this dashboard is scoped to your institute.
4. Select **View Review** to read submitted assessments and reviewer names.

### Monitor rankings

Open **Rank Dashboard**, then select **Ranked Proposals** or **Unranked Proposals** inside **Reviewer Rankings**. Use Domain/Status filters to narrow results. Status describes proposal review status, not rank state; selecting Pending can produce no results because ranking lists contain completed reviews.

**Rank / Reviewer Total** compares a saved rank with that reviewer's completed proposals in the same domain and set, including proposals from other institutes. It is not a single institute-wide ranking. PIC access is for monitoring; switch to LDC, if assigned, to submit reviews or edit personal ranks.

### Download

Select completed reviews in either dashboard and choose **Download Selected Reviews**, or use **Download Review PDF** inside View Review.

## 7. Admin guide

### Review Dashboard

Select Reviewed or Pending proposals and filter by **Domain**, **Institute** and **Reviewer**. Domain Progress and Reviewer Progress summarise filtered results. Reviewer Progress excludes Admin and Assistant Reviewer accounts. Pending includes drafts, but their answers remain private. Open **View Review** to inspect completed assessments.

### Proposal Dashboard

Browse all proposals using Status, Institute and Domain filters. **View Proposal** opens the supporting document. Clear filters restores the unfiltered list.

### Rank Dashboard

Select Ranked or Unranked proposals and narrow results using Domain, Institute and Reviewer. Use View Review, View Proposal and justification View controls to inspect supporting material. Each reviewer's ranking list is independent. This dashboard does not edit their ranks.

### User Dashboard

Use the read-only **Users & roles** table to inspect assignments and filter by Domain, Institutes, Roles and Active/Inactive Status. User accounts, roles and proposal assignments are maintained in Google Sheets, not edited through this dashboard. Coordinate changes with the application administrator/developer and follow the technical guide.

### Download

Select completed reviews in monitoring/ranking lists and choose **Download Selected Reviews**. View Review also offers **Download Review PDF**.

## 8. PDF downloads

Each selected review downloads as a separate PDF. Allow multiple downloads if your browser prompts, or use the individual filename links shown by the portal.

The PDF includes proposal metadata/link, reviewer, reviewed timestamp, recorded rank/justification, numbered ratings, comments and footer. Long comments can span pages. Historical reviews retain their recorded scale. If non-Latin characters render incorrectly, report the affected review to support; the current PDF fonts have limited language coverage.

## 9. Saving, errors and help

| Situation | What to do |
|---|---|
| No OTP arrives | Confirm the registered email, check spam and wait for cooldown before requesting a new code. Contact the administrator if it persists. |
| Wrong or expired OTP | Use only the newest code; request a new one after cooldown if necessary. |
| Session expires while editing | Keep the same tab open and sign in with the same account to recover in-memory work. Closing or reloading loses unsaved edits. |
| Stale-edit or reservation message | Refresh and inspect the latest saved state before editing again; coordinate with the assigned reviewer. |
| Update could not be confirmed | Refresh and check whether the change saved before retrying. Do not repeatedly submit. |
| Portal unavailable | Give the administrator the time and operation that failed. Never share OTPs or secrets. |
| Expected proposal/role missing | Ask the administrator to check your active account, role, domain, institute and assignment in Sheets. |

Save before refreshing, switching roles or leaving. Support contacts shown in the application: support@vlabs.ac.in and manager.iitdelhi@gmail.com.

For developer and configuration details, see the [Technical Guide](technical-guide.md).

## Proposal Set filter

All proposal dashboards offer All sets, Set A and Set B. Set A matches Proposal IDs beginning with `A_`; Set B matches `B_`. Other IDs appear only under All sets. The User Dashboard is unchanged. Set combines with existing filters and updates proposal counts and monitoring progress. Clear filters resets it. Downloads select from visible rows. In My Rank Dashboard, switching sets preserves edits; Save Rankings saves edits across sets and Generate Rankings still ranks the reviewer’s full list. No spreadsheet column or configuration change is required.

## Summary Dashboard

Every signed-in role can open Summary Dashboard to see portal-wide aggregate counts, including across domains and institutes. The Domain-wise Summary and Institute-wise Summary each show Number of Labs, Number of Experiments, Number of Proposals Reviewed and Number of Pending Proposals. Set filters use A_/B_ Proposal ID prefixes. Each unique nonempty Proposal ID in Proposals counts as one lab; duplicate IDs fail validation. A completed review or Reviewed proposal status counts as reviewed; all others, including drafts, count as pending. Completed Reviews records with no corresponding Proposals row are excluded. Experiments sum valid nonnegative whole numbers from the optional No. of Experiments column. Missing/invalid values are flagged as incomplete; missing domain/institute labels appear as Not configured. Only aggregate counts are exposed; access to proposal/review details is unchanged. The read-only getSummaryData API returns domains and institutes arrays and validates the active user.

Both Summary Dashboard tables include a Total row at the bottom. Totals follow the selected Set filter and remain at the bottom when sorting. Experiment totals retain any incomplete-count warning.

## LDC proposal selection

My Workspace → Reviewed Proposals has a final Selected column with Yes/No choices (default No). Choose values and click Submit Selections to save. Only the author of a completed review can change its selection; historical rows without a completed-review record are not editable. Domain Dashboard → Selected Proposals shows saved Yes choices across the domain and follows the Set filter. Submit No to remove a proposal from that card. Selection does not change review status or rankings. Download checkboxes remain separate. Unsaved choices persist across Set filters and card changes; navigation warns before discarding them. Same-account session recovery can restore them.

The saveProposalSelections write action uses the existing Sheets lock/batch flow and rejects stale or unauthorized edits. On first save it creates optional Selected and Selection Revision columns in Completed Reviews; no manual schema or environment change is required. Selected stores Yes/No, and Selection Revision supports concurrent-edit checks. Blank selections read as No.

## Separate set rankings

Ranks are independent for each reviewer, domain and set. A_ IDs belong to Set A and B_ IDs to Set B; each can start at Rank 1. IDs without either prefix use a separate legacy group. Automatic generation starts at 1 independently in each group. Rank choices and Rank / Reviewer Total use the number of that reviewer’s reviewed proposals in the same domain and set, including other institutes. Set filtering changes visibility, while Save Rankings saves edits in all sets and Generate Rankings generates each group separately. Later duplicate ranks in spreadsheet row order within one group display as unranked; the first eligible valid rank remains ranked. Duplicate choices submitted through the UI are rejected. Reading dashboards never rewrites imported ranks. Existing ranks beyond a group’s proposal count remain unranked until corrected. No data migration or environment change is required.

## Compact Set filters and selected summaries

My Workspace and Domain Dashboard place the compact Set selector at the right of the table action row, even when there are no download actions. My Rank Dashboard places it beside Generate Rankings. Choose All sets to reset these selectors. Summary Dashboard has synchronized Set selectors at the right of each table heading. My Workspace adds a Selected Proposals card for your own saved Yes choices; Domain Dashboard continues to show domain-wide choices. Both four-card groups share one desktop row and stack on small screens. Summary tables and their Total rows now include Selected Labs and Selected Experiments, based on saved Yes values in Completed Reviews and experiment counts from Proposals. Missing counts for selected labs are flagged as incomplete. No new configuration or spreadsheet columns are required.

## Admin selected proposals

Admin Review Dashboard shows Reviewed Proposals, Pending Proposals and Selected Proposals cards in one desktop row. Selected Proposals contains completed reviews with saved Selected = Yes and is read-only for Admin. The compact Set selector sits at the right of the table action row and combines with Domain, Institute and Reviewer filters; cards and progress totals follow those filters. Choose All sets or Clear filters to reset it. PIC screens and selection editing permissions are unchanged.
