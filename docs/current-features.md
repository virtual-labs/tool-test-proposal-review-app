# Current application features

Reviewed against repository source on 4 November 2026. This describes implemented behaviour, not a certification of the live deployment.

## Roles and screens

| Role | Workspace and access |
|---|---|
| LDC | My Workspace, My Rank Dashboard, Domain Dashboard; My Assistant Reviewers Dashboard when assistant assignments exist. Saves drafts and submits assigned final reviews. Detailed final-review access is limited to the user's own submissions. |
| Assistant Reviewer | Assigned, Draft and Submitted to LDC cards. Saves own answers and hands them to the assigned LDC; cannot overwrite an existing LDC draft. Can view an assigned final review but cannot download final-review PDFs. |
| PIC | Institute-scoped PIC Dashboard and Rank Dashboard. Domain and Status filters; Reviewed/Pending summary cards above the PIC filter panel. |
| Admin | Review Dashboard, Proposal Dashboard, Rank Dashboard, User Dashboard. Review/Rank monitoring has Domain, Institute and Reviewer filters; no Status filter. Proposal directory retains Status. |

PIC/LDC dual-role users switch Active Role. Access checks still run on the server: displaying the reviewer name does not grant additional review access.

## Shared interface

- Sign-in tagline: “A shared workspace for lab proposal reviews”. Email OTP, separate Help and role-specific User Guide dialogs.
- Original portal Arial typography, colours, compact controls and dashboard heading styles; My Assistant Reviewers Dashboard also uses the shared 30px heading.
- Personal LDC workspace retains Saved Draft Proposals. Domain Dashboard has Reviewed, Pending and Ranked cards; no Saved Draft card or Action column. Domain pending includes saved drafts.
- Admin/PIC pending also includes saved drafts without exposing private draft answers. Admin Reviewer Progress excludes Admin and Assistant Reviewer accounts; Submitted is the last column. PIC progress is institute scoped and does not use that Admin-only exclusion.
- Pending tables have no date column. Saved Draft Proposals uses Updated on; other proposal tables use Submitted on. Rank monitoring uses Last Updated.
- Recognized timestamps display as date-only text, with the full formatted timestamp on hover. Formatting is IST, at minute precision; unknown legacy strings remain unchanged. PDF timestamps remain visible because PDFs have no hover UI.
- S.No. is shown in proposal boards, ranking tables, Admin directories and View Review's ratings table. It follows selection checkboxes where present and follows displayed row order. Assistant list/progress tables do not all have S.No.
- View Review displays Reviewer for every authorized role, falling back to assistantName or Not recorded. Assistant Reviewer is separately displayed when supplied. Completed reviews remain read-only.

## Rankings

- Rank 1 is highest priority. Each reviewer maintains an independent list of personally reviewed proposals in their domain.
- Current form: eight ratings from 1–6. LDC Overall Score totals the first seven ratings (maximum 42); Admin/PIC Overall Rating displays the eighth rating out of 6.
- Generation is explicit: Generate Rankings saves score-descending ranks, breaking ties by Proposal ID. Reading a dashboard or submitting a review does not automatically generate ranks.
- Manual ranks must be unique. Unranked proposals sort first ascending, with Proposal ID ties. Clearing all ranks is supported.
- Add / View/Edit opens a justification editor. Submit stages the edit; Save Rankings persists it. Cancel/Escape discards dialog edits. Read-only View popups are used in monitoring/domain tables.
- LDC ranking totals use a compact summary. Monitor cards show Count / Total Proposals for the filtered reviewed set.
- PIC Rank Dashboard has a Reviewer Rankings panel containing cards, Domain/Status filters, result explanation and table. Status means proposal status (Reviewed/Pending), not Ranked/Unranked; use the cards for rank state. Since ranking results contain completed reviews, Pending can produce empty results.
- Generate Rankings sits at the right of the download/selection toolbar beneath Ranking Guidelines. Ranking Guidelines contains seven points.

## Downloads

PDF downloads use an A4 form layout: bold metadata, reviewer name, visible reviewed timestamp, rank/justification, clickable proposal link, a bordered S.No. / Evaluation Parameter / Rating table, comments and footer. Long comments flow onto additional pages. Historical reviews preserve their recorded scale and legacy feedback. Built-in fonts have limited non-Latin support.

Admin/PIC can download from View Review. LDC downloads authorized own reviews using selection toolbars. Assistant final-review access is view-only. Records without a detailed review cannot be downloaded.

## Spreadsheet imports

Use exactly Proposals, Users, Completed Reviews and Draft Reviews. A separate Rankings tab is not read. Required headings are defined in src/domain.js and listed in the private manual; heading whitespace is trimmed, but duplicate headings after trimming fail.

- Review ID heading is required; imported values need not use UUID syntax. Use stable, unique, non-empty IDs as an import convention. The code does not enforce imported ID uniqueness; completed reviews are associated by Proposal ID and there should be one completed review per proposal.
- Preserve Proposal ID, reviewer email, domain, form version and original rating scale. Do not label historical 1–5 data as version 2.
- Prefer explicit ISO timestamps, for example 2026-10-14T10:15:28.000Z (UTC), equivalent to 2026-10-14T15:45:28+05:30 (IST). Never append Z to local time without conversion.
- Native Sheets date/time cells are interpreted using the spreadsheet timezone. Slash-formatted plain text is not parsed as a date, so sorting/date-only display can be incorrect. Do not infer the timezone of imported records; confirm it first. Preserve blanks and row associations.
- Rank is numeric; Rank Justification and Rank Updated At are optional metadata created by ranking writes. Rank Order Mode is optional: changed manual rank saves write Manual. It does not replace Rank or select an automatic-ranking mode.

See [deployment](deployment.md), [verification](verification.md), and [UI alignment](ui-alignment.md). No new environment variables are required for these interface changes.
