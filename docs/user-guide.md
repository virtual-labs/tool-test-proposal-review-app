# User Guide

Reviewed against the application source on 18 November 2026.

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

- Select a summary card to display its associated list. Filters narrow results; **Clear filters**, where available, resets the filters. Choose **All sets** to reset a compact Set selector. Card counts can describe the filtered set rather than all records.
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

### Select reviewed proposals

In **My Selection Dashboard**, choose **Yes**, **No**, **On Hold** or **-** in the **Selected** column and click **Submit Selections**. The default is **-** (not decided). Only the review author can edit this choice; records without a detailed completed review are not editable. Saved Yes choices appear in **My Workspace → Selected Proposals** and **Domain Dashboard → Selected Proposals**. Submit No, On Hold or - to remove them. Selection does not change review status or rank, and download checkboxes are separate.

Set changes and card changes preserve unsaved selection edits. Save before leaving the dashboard. My Workspace and Domain Dashboard each have four cards in one desktop row; cards stack on small screens.

### Work with assistant reviewers

When assistant assignments exist, open **My Assistant Reviewers Dashboard** to monitor them. Use the compact Set selector at the right above the table, matching My Workspace; choose **All sets** to reset it. **Review Draft** opens an assistant's handed-off answers as your draft. Review and edit those answers before submitting the final assessment. You remain responsible for the final review.

### Rank completed reviews

1. Open **My Rank Dashboard** and read **Ranking Guidelines**.
2. Rank only the proposals whose final review you submitted in your domain. New completed reviews remain unranked until ranks are saved or generated.
3. Enter ranks manually, with **1** as the highest priority. Avoid duplicate ranks within the same set in your list.
4. Alternatively, select **Generate Rankings**. This replaces and saves ranks independently within each set using overall score descending, then Proposal ID ascending to break ties. The score totals the first seven criteria, out of 42; the eighth overall rating is separate.
5. Use **Add** or **View/Edit** in Justification to explain a rank. **Submit** in the dialog stages the text; **Save Rankings** persists both ranks and justifications. Cancel or Escape discards dialog edits. Submit blank justification text and save to remove it.
6. Save manual changes with **Save Rankings**. To remove a rank, choose **- (Unranked)** and save; repeat for every proposal to clear all ranks.

Each reviewer has an independent ranking list within each domain and set, so different reviewers can use the same rank numbers. You cannot edit another reviewer's rankings. In ascending rank order, unranked entries appear first.

### Monitor the domain and download reviews

**Domain Dashboard** shows Reviewed, Pending, Ranked and Selected proposals across your domain. Pending includes saved drafts. Reviewed Proposals displays the saved Selected value (Yes, No, On Hold or -), read-only. Selected Proposals includes experiment counts and a total for the current Set filter, with Submitted on last; missing or invalid experiment counts are flagged as incomplete. It has no Saved Draft card or Action column; other reviewers' assessment details remain private.

To download your own completed reviews, select checkboxes in **My Workspace → Reviewed Proposals** or **My Rank Dashboard**, then choose **Download Selected Reviews**.

## 5. Assistant Reviewer guide

1. Open **Assigned Proposals** to view your assignments.
2. Read the proposal and existing lab links, then fill in the assessment.
3. Select **Save as Draft** to save incomplete work. Open **Draft Proposals → Resume Draft** to continue.
4. When ready, select **Submit to LDC**. You cannot edit the assessment after handoff. Handoff is blocked if an LDC draft already exists, protecting the LDC's work; contact the LDC to coordinate.
5. Under **Submitted to LDC**, select **View Submitted Review** to read your original answers.
6. After the LDC finalises the assessment, use **View Final Review** to read it. Final-review access is view-only for assistants; PDF download is unavailable.

Use the Set filter to narrow assignments; Clear filters restores them. Assistants cannot edit final proposal selections or rankings. Summary Dashboard is available for portal-wide aggregate totals (see section 10).

Assistant handoff is not the final review submission. The LDC checks the answers and submits the final assessment.

## 6. PIC guide

### Monitor institute proposals

1. Open **PIC Dashboard**. If you also have LDC access, first select PIC under **Active Role**.
2. Choose **Reviewed Proposals** or **Pending Proposals**. Pending includes saved drafts, without exposing their answers.
3. Filter using **Domain**, **Status** and **Set**. Institute and Reviewer filters are not shown because this dashboard is scoped to your institute.
4. Select **View Review** to read submitted assessments and reviewer names.

PIC Dashboard includes a read-only Selected Proposals card for its institute. Rank Dashboard has no Selected Proposals card. You can see portal-wide selected counts in Summary Dashboard (section 10).

### Monitor rankings

Open **Rank Dashboard**, then select **Ranked Proposals** or **Unranked Proposals** inside **Reviewer Rankings**. Use Domain, Status and Set filters to narrow results. Status describes proposal review status, not rank state; selecting Pending can produce no results because ranking lists contain completed reviews.

**Rank / Reviewer Total** compares a saved rank with that reviewer's completed proposals in the same domain and set, including proposals from other institutes. It is not a single institute-wide ranking. PIC access is for monitoring; switch to LDC, if assigned, to submit reviews or edit personal ranks.

### Download

Select completed reviews in either dashboard and choose **Download Selected Reviews**, or use **Download Review PDF** inside View Review.

## 7. Admin guide

### Review Dashboard

Select Reviewed, Pending or Selected Proposals. Selected Proposals shows saved Yes choices read-only. Filter by **Domain**, **Institute** and **Reviewer**, with the compact **Set** selector at the right of the table toolbar. Domain Progress and Reviewer Progress summarise filtered results. Reviewer Progress excludes Admin, Assistant Reviewer and PIC accounts (based on the primary Role in Users). Pending includes drafts, but their answers remain private. Open **View Review** to inspect completed assessments.

### Proposal Dashboard

Browse all proposals using Status, Institute, Domain and Set filters. **View Proposal** opens the supporting document. Clear filters restores the unfiltered list.

### Rank Dashboard

Select Ranked or Unranked proposals and narrow results using Domain, Institute, Reviewer and Set. Use View Review, View Proposal and justification View controls to inspect supporting material. Each reviewer's ranking list is independent within each domain and set. This dashboard does not edit their ranks.

### Summary Dashboard

Open Summary Dashboard for portal-wide lab, experiment, review and selected totals. See section 10 for filters and counting rules.

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

## 10. Summary Dashboard — all roles

Every signed-in role can open Summary Dashboard. It shows **portal-wide** totals across domains and institutes, including for PIC and Assistant Reviewer accounts. This does not expand access to individual proposals or private reviews.

Both **Domain-wise Summary** and **Institute-wise Summary** include:

- Number of Labs and Experiments.
- Number of Proposals Reviewed and Number of Pending Proposals.
- Selected and Selected Exp., based on saved Yes choices.
- A Total row that follows the Set filter and stays at the bottom when sorting.

The compact Set selectors sit at the right of both table headings and stay synchronized. Changing either updates both tables. Choose **All sets** to reset.

Each Proposal ID in Proposals counts as one lab. A completed review or Reviewed status counts as reviewed; other proposals, including drafts, count as pending. Experiments use the recorded No. of Experiments. Missing or invalid experiment counts are flagged as incomplete rather than presented as a complete total. Missing domains/institutes appear as Not configured. Reviews without a corresponding proposal row are excluded.

## 11. Set filters and ranking groups

**Set A** matches IDs beginning with A_; **Set B** matches B_. Other IDs appear only under All sets. The User Dashboard has no Set filter.

| Screen | Set filter location and reset |
|---|---|
| LDC My Workspace / Domain Dashboard | Right of the proposal-table action row; choose All sets. |
| LDC My Rank Dashboard | Beside Generate Rankings; choose All sets. |
| Admin Review Dashboard | Right of the table action row; choose All sets or Clear filters. |
| My Assistant Reviewers Dashboard | Right above the table; choose All sets. |
| Admin Proposal / Rank dashboards, PIC dashboards, Assistant Reviewer workspace | In the filter panel; choose All sets or Clear filters. |
| Summary Dashboard | Right of both table headings, synchronized; choose All sets. |

Filters narrow visible rows and card counts. Downloads use visible selected rows. In My Rank Dashboard, filtering preserves edits; Save Rankings includes edits across sets, and Generate Rankings generates each set independently even when only one set is displayed.

Each reviewer has separate ranks within each domain and set. Set A and Set B can each start at Rank 1; IDs without either prefix form a separate legacy group. Rank choices and Rank / Reviewer Total use that reviewer's reviewed proposals in the same domain/set, including other institutes. Manual duplicate rank choices are rejected. For duplicate spreadsheet entries within a group, the first eligible valid rank remains ranked and later conflicts appear unranked. Ranks above the group's proposal count also appear unranked. Ask the administrator to resolve imported conflicts; viewing a dashboard does not rewrite the sheet.


### Selection remarks and table columns

LDC users can edit Remarks in My Selection Dashboard, then click Submit Selections to save Remarks and Selected together. Remarks are optional (up to 10,000 characters). Admin/PIC and Domain Dashboard display them read-only. Pending and Saved Drafts do not have this field.

Selected Proposals columns are S.No., Proposal ID, Proposal Name, Experiments, Action (View Review), Overall Score (out of 42), Rank, Justification, Selected, Remarks, and Submitted on last. Domain Dashboard omits Action. PIC sees only its institute’s selected proposals and does not see Overall Score. Existing View Review permissions remain unchanged. Experiment totals follow the active filters.

The optional Remarks column in Completed Reviews is created on save; no manual sheet setup is needed. Remarks share Selection Revision concurrency protection, including a check against the original Remarks value.


### My Selection Dashboard

LDC and Admin users can open My Selection Dashboard. LDC sees all their own reviewed proposals, including -, No, On Hold and Yes, and can edit Selected and Remarks there. Admin sees saved Yes selections across all proposals, read-only. PIC has no My Selection Dashboard. Use Set to narrow the list. The columns match Selected Proposals, without Submitted on; PIC’s Selected Proposals card omits Overall Score. LDC can edit Selected and Remarks and save with Submit Selections; Admin/PIC are read-only. View Review retains existing role permissions.

Remarks use Add / View/Edit / View dialogs, separately from Rank Justification. Submit in the dialog stages an edit; Submit Selections saves it. Cancel discards dialog changes. Clear and submit the text to remove Remarks.

Summary headings are Domain (or Institute), Proposals, Experiments, Reviewed Proposals, Pending Proposals, Selected Proposals and Selected Exp. PIC status options display Reviewed and Pending.


LDC dashboard tab order: My Workspace, My Rank Dashboard, My Selection Dashboard, Domain Dashboard, Summary Dashboard, and My Assistant Reviewers Dashboard (when available). My Workspace Reviewed Proposals omits Selected and Remarks; selection and remark editing is available only in My Selection Dashboard. The Selected Proposals card remains read-only. Sheet source headers such as No. of Experiments remain unchanged.
