# Apps Script to React/Node feature comparison

Reviewed 29 October 2026; implementation completed locally on the same date. The comparison below records the original gaps. P01–P14 are now addressed in the React/Node code; live deployment remains a separate step.

## Sources and scope

- Read the requested changes in **Virtual Labs — Testing Environment Setup** (chat `01a1439b-ae82-7232-b668-beea008dcc9f`), including the later corrections that superseded earlier automatic-ranking and formatting requests.
- Read recent context in **Explain AppScript application** (chat `01a11a3e-7245-7693-a2a7-75425f35c9f4`). Its recent turns primarily cover documentation and Git operations.
- Compared the testing Apps Script source at `../src/appscript/Code.gs`, `../src/appscript/index.html`, and associated testing documentation against this repository's React components, domain code, tests and deployment configuration.
- Findings concern current local Vercel application source. The authenticated production Vercel deployment and deployed Apps Script source were not compared. A passing baseline test does not establish feature parity.
- Earlier requests for automatic ranking during dashboard loading were superseded by the explicit Generate Rankings action. The final formatting request uses red button references and blue italic references, superseding dark green.

## Original missing or partial changes (now implemented)

| ID | Area / latest requested behavior | Current React/Node behavior | Evidence / required correction |
|---|---|---|---|
| P01 | LDC Ranking Guidelines button/dialog with seven finalized points, bold point headings, red button references and blue italic references | No Ranking Guidelines button/dialog; only a short introductory paragraph | `client/components/Ranking.jsx`, RankEditor. Restore the approved content and dialog. Styling rules retained in CSS do not create the missing UI. |
| P02 | Generate Rankings aligned right beneath Ranking Guidelines, inline with selection/download buttons | Generate Rankings is the first toolbar button; the guideline anchor is absent | `Ranking.jsx`, RankEditor toolbar. Restore the requested placement outside the scrolling table. |
| P03 | LDC justification is Add / View/Edit, opening an editor; clearing and submitting stages removal; Save Rankings persists it | A permanently visible textarea in every row | `Ranking.jsx`, justification column. Storage and removal are present, but the requested interaction and explanatory text are missing. |
| P04 | Admin, PIC and LDC read-only justification columns use compact View popups | Admin/PIC RankMonitor and LDC Domain Board render the full text | `Ranking.jsx`, RankMonitor columns; `Boards.jsx`, Board extra columns. Replace text cells with read-only View controls. Preserve full text in review views/PDFs. |
| P05 | LDC ranking defaults to unranked first by Proposal ID, then saved Rank ascending; ascending Rank sorting places unranked first, including Domain Reviewed Proposals | Table has no default sort; ranking rows use API order; null/empty sort values always go last regardless of direction | `Common.jsx:5`, `Ranking.jsx` rank sort accessor, `src/domain.js:903`. Add explicit rank ordering and deterministic ID tie-breaking. Clearing all ranks is already supported. |
| P06 | PIC dashboard has only Reviewed/Pending cards; no Saved Draft status choice | PIC uses Board scope `monitor`, which retains the draft card; its Status options explicitly include `draft` | `Boards.jsx:17` and `Boards.jsx:33`. Apply the PIC-specific card and filter requirements. |
| P07 | Admin Review Dashboard removes Status filter | Admin filter fields still include `status` | `Boards.jsx:33`. The separate Proposal Dashboard status filter is intentionally required and should remain. Admin pending already includes drafts. |
| P08 | Admin Reviewer Progress excludes Admin and Assistant Reviewer rows; Submitted is the last column | Backend excludes assistants, but includes Admin; React does not apply the old frontend's Admin exclusion. Reviewed appears before Pending | `src/domain.js:529`, `Boards.jsx:33`; old HTML `progressReviewers` filter. Restore the exclusion and final Submitted column. |
| P09 | Rank Dashboard cards show count / filtered total, with approved labels explaining the filtered set | Cards pass only counts, so no denominator or approved explanatory labels appear | `Ranking.jsx:5`, `Common.jsx:19`. Use ranked + unranked filtered rows as denominator, as in the original. Review-dashboard cards already pass totals, but omit the requested filtered-total explanation. |
| P10 | Admin ranking columns include Domain → Institute → Reviewer → Overall Rating → Rank; PIC retains Overall Rating | Overall Rating is absent from both monitoring tables, despite being supplied by the backend | `Ranking.jsx:5`; old HTML `renderAdminRankingCards`. Restore the 6-point rating in Admin/PIC; keep the LDC's 42-point score unchanged. |
| P11 | Requested S.No. columns in LDC ranking, Admin Proposal and User tables, with checkbox before S.No. where applicable | Shared React Table does not generate serial numbers; none of those column lists adds one | `Common.jsx:5`, `Ranking.jsx`, `Boards.jsx:38`. Restore serial numbers and requested column order. |
| P12 | Login Help retains seven specific troubleshooting points, including unable to sign in, missing verification email and invalid/expired code | One generic sign-in paragraph replaces the structured troubleshooting content | `Common.jsx:20`; original HTML `loginHelpDialog`. Restore the approved help content adapted only for the current OTP architecture. |
| P13 | Updated role-specific user guides; Administrator User Guide label and title; Admin guide includes Proposal/User dashboards | Help and User Guide buttons open the same generic component. Header button says Administrator User Guide, but guide title becomes Admin User Guide. Detailed role workflows are absent | `App.jsx:64`, `Common.jsx:20`; original HTML role guide content. Restore separate Help and role-guide content with matching title. |
| P14 | Content-specific column spacing, compact Rank/Justification gap and nonwrapping Domain values | React Table emits neither `data-column` attributes nor the original table-specific class/IDs used by many copied CSS selectors | `Common.jsx:13`, `client/styles.css`. Restore applicable styling hooks or replace selectors. This is a confirmed styling-hook omission; exact pixel/layout impact needs a visual comparison after content corrections. |

## Changes already carried over

- Admin navigation order: Review Dashboard, Proposal Dashboard, Rank Dashboard, User Dashboard.
- Admin User Dashboard Name (email), domain/institute/role/status filtering; Admin domain displays Not applicable and Assistant Reviewer domain is retained.
- Admin proposal directory treats drafts as pending; Admin Review Dashboard hides its draft card and includes drafts in pending.
- PIC reviewer names in ranking rows are names only.
- LDC Overall Score out of 42 derives from the first seven current-form scores.
- Explicit Generate Rankings action sorts by score descending and Proposal ID ascending for ties, preserves saved justifications and allows subsequent manual editing. It is not automatically invoked on review submission or dashboard reads.
- Empty/manual rank saves are supported, including removing all ranks. The outstanding defect is display ordering and the requested unranked presentation.
- Justification is persisted with rankings and included in View Review and PDF generation. The missing parts are table controls and dialogs.
- Assistant draft/handoff workflows, role-based permissions, stale-write protection and OTP authentication exist.
- Dashboard/filter resource hooks fetch the requested view without re-fetching initial data merely because a tab/filter changed; backend uses one request-local Sheets snapshot. This does not establish a measured live speed improvement.

## Verification

- `npm test`: 21 passed, 0 failed.
- `npm run test:ui`: production build passed; five Edge browser workflows passed against fabricated Sheets/Redis/mail fixtures.
- Existing browser tests explicitly expect the always-visible justification textarea and do not assert the requested dialogs, PIC draft removal, missing rating columns or rank-first ordering. They need expanded coverage when these features are restored.
- An additional exploratory browser audit was attempted using local fixtures; its first run stopped on an incorrect accessible-name selector, and a retry encountered a browser resource error. A further retry stalled and was stopped. These are audit-tool failures, not established application defects. Source findings above do not depend on those runs.
- No live email was sent, no spreadsheet was changed, and no deployment was performed by this review.

## Suggested implementation sequence

1. Correct Admin/PIC card/filter behavior and reviewer-progress eligibility/order.
2. Restore ranking sorting, totals, rating/serial columns, justification dialogs and toolbar alignment.
3. Restore finalized guidelines, login Help and role-specific guides, then apply table styling hooks.
4. Add browser assertions for each parity item, run existing regression tests, and verify the deployed release with authorized test accounts.

Do not reintroduce retired password authentication, a required Rankings sheet, or the earlier automatic-on-load ranking behavior when restoring these features.


## Implementation and verification update

- P01/P02: restored the seven-point Ranking Guidelines dialog, red button references/blue italics, and right-aligned Generate Rankings toolbar beneath the guideline button.
- P03/P04: justification Add/View/Edit stages changes in a dialog; Cancel/Escape discards dialog edits; Save Rankings persists them. Read-only View dialogs are used by Admin, PIC and LDC domain tables. Full text remains available in submitted reviews and PDFs.
- P05/P11/P14: default ranking and domain reviewed ordering puts unranked proposals first, then saved rank; ties use Proposal ID ascending. Serial numbers follow checkboxes and reflect displayed order. Tables expose the existing column styling hooks and scroll horizontally without moving toolbars.
- P06/P07/P08: PIC and Admin monitoring show Reviewed/Pending only; drafts count as Pending for both, including PIC status filtering. Admin has no Status filter in Review Dashboard, and Reviewer Progress excludes Admin/Assistant Reviewer with Submitted last. LDC draft workflows remain available.
- P09/P10: rank-monitor cards display filtered count/total; Admin/PIC tables restore Overall Rating out of 6. LDC retains Overall Score out of 42.
- P12/P13: seven-point login Help and separate role-specific guides are restored. Administrator User Guide title is consistent; PIC guide reflects the updated card behavior.
- Dialogs support native modal keyboard containment, Escape/Cancel, focus return, and opening long content at the top. Text is rendered as React text, including justification that resembles HTML.

Tests: lint, production build and 23 backend/unit tests pass. Nine Edge browser workflows pass against local fabricated services. The first parity run exposed focus-return failures; these were fixed and rerun. Visual inspection of desktop/mobile screenshots identified initial scrolling in long dialogs, which was corrected and covered by a browser assertion. No remaining test failures are known after the final run.

No environment variables, Apps Script email service changes or new spreadsheet columns are needed for this release. No commit, push or deployment was performed. The original Apps Script/Cloudflare application sources were not edited.
