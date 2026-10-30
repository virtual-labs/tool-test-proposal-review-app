# UI alignment with the original portals

## Frontend goal
Match the Apps Script and Cloudflare portal typography, colours and component treatment while preserving the later requested React behaviour. Both supplied index.html files contain identical CSS. Original source files were read only.

## Screens and components
- Login/OTP: original explanatory wording, email placeholder and font sizing; retained the approved short header tagline.
- Header/navigation: restored full-size user metadata, domain, guide button, compact secondary navigation and refresh icon. Mobile controls wrap beneath the brand to avoid crushing the title.
- LDC, Assistant, Admin and PIC dashboards: restored 30px desktop dashboard headings, reference instructions and status-based mint/peach/red cards.
- Domain: retains Pending, removed draft card and removed Action column as explicitly requested earlier.
- Rankings: restored compact LDC ranking summary, compact save button, original rank selector/table dimensions and shorter monitor card headings with explanatory captions.
- Forms/review view: restored proposal-details eyebrow, reference-link layout, form heading/instructions, comments help and bold muted metadata.
- Dialogs: original backdrop and styling, with retained keyboard focus restoration and mobile scrolling.

## Data and API
No API, authentication, environment or Google Sheets schema changes.

## Verification and accessibility
Lint, build, 23 Node tests and 10 Playwright tests passed. Browser coverage includes OTP errors, expiry/recovery, draft/final submission, assistant handoff, ranking editing, downloads, guides, filters, sorting and role switching. New tests compare computed typography against the original CSS and exercise role navigation at 1440px and 390px, checking horizontal overflow and mobile header width. Screenshots are written to ignored test-results/ui-*.png. Desktop and mobile captures were visually inspected; a squeezed mobile header was found and fixed.

An initial screenshot test timed out with the reference tab in front; bringing the app tab forward resolved it. No failures remain. These checks use local fixture data, not production accounts; they do not establish pixel-for-pixel equivalence for every possible data set.

## Approval and next handoff
No additional design approval required: supplied source is the reference. Next action is deploy the updated React app and smoke-check with production role accounts.

## Screenshot follow-up
PIC summary cards now precede the filter panel. Restored institute-specific instructions, filter help, result counts and Count / Total Proposals captions. Rank monitoring groups cards, filters and results inside one Reviewer Rankings panel, with Domain and Status for PIC. Browser checks cover vertical placement and resetting the Status filter. Build, lint and all 10 browser tests passed; desktop captures were inspected against the supplied screenshots.
