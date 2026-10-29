# React + OTP deployment and release

## Target architecture

React/Vite builds static assets into `dist/`. Vercel serves those files and the Node API at `/api` through `api/index.js`. Google Sheets remains the application database. Redis REST stores OTP challenges, limits, sessions and write locks. A standalone Apps Script MailApp relay sends OTP and submission confirmations; the UI, API and OTP verification remain on Vercel. No password credentials or AUTH_SPREADSHEET_ID are used.

The local manual checklist is MANUAL_CONFIGURATION.md, intentionally ignored by Git. Public setup instructions remain in README.md. Environment files, dist artifacts, node_modules and browser results are also ignored.

## Preview deployment

1. Review and push the repository when authorized; this implementation has not been pushed.
2. Import in Vercel, framework **Other**, install `npm ci`, build `npm run build`, output directory **dist**, Node.js 22 or 24.
3. Set the variables listed in README.md for Preview. Use a test copy of the spreadsheet and dedicated test Redis. Follow apps-script-email/README.md to authorize and deploy a separate test MailApp relay. Set MAIL_RELAY_URL, matching MAIL_RELAY_SECRET and a distinct random OTP_SECRET.
4. Set APP_ORIGIN to the exact HTTPS preview origin and redeploy after changes. Origins are not implicitly trusted.
5. Check the plan's function duration allowance against the configured 60 seconds. Verify function packaging/routing on Vercel; local build success is not deployment evidence.
6. Run the live acceptance checks below before using production data.

## Live smoke tests

- Request and verify an OTP, test wrong/expired/replayed codes, resend cooldown, session restoration and logout. Codes must never appear in API responses or logs.
- Verify disabled/unregistered accounts have no access; limits work across function instances.
- Verify each role and dual-role account against real Users assignments.
- Save/resume a draft, reject stale edits, hand assistant answers to LDC, submit once, retry without duplication, and test concurrent updates.
- Save manual ranks/justifications, generate automatic ranks, clear ranks, and reject stale or unauthorized rank changes.
- Check all dashboards/directories/filters, historical reviews, proposal links and PDF permissions.
- Visually inspect PDFs using representative names, languages and long comments.
- Verify review confirmation email delivery without allowing mail failures to undo saved reviews.
- Confirm the production frontend contains no secrets, legacy password UI or test inbox endpoints. The ignored manual configuration document must not be downloadable.
- Measure real latency and service quotas. Local fixture tests do not establish production performance.

## Security and limits

Implemented: HMAC-protected OTP records; cryptographic code/challenge generation; short expiry; one-time atomic consumption; latest-challenge enforcement; attempt/cooldown/global/IP/email limits; HttpOnly SameSite session cookies; origin and request-size checks; server-side role/ownership checks; formula-safe writes; atomic Sheets batches; ownership-checked write locks.

Delivery failures are logged without codes, and invalidate the challenge. Unknown/disabled emails get the same public response content. Sending email can introduce timing differences; complete elimination of user-enumeration timing is not claimed. Email OTP is single-factor, not MFA. Protect relay and Redis credentials. The relay requires execute-as-owner / Anyone access, verifies signed timestamped requests, and persists duplicate-send guards. It requests send-mail permission only. Google recipient quotas and the relay daily cap limit delivery; no automatic retry queue exists.

Redis locks do not coordinate manual spreadsheet edits or the old portal. The existing four-minute ambiguous-write lease behavior is retained. Google/Redis/mail access, Vercel deployment, representative live concurrency and multilingual PDF rendering remain release checks. No certification or production-readiness claim follows from local tests alone.

## Cutover and rollback

Back up Sheets. Disable old-portal writes before allowing the new application to use the same live spreadsheet. Configure production-specific services and the exact final origin, then rerun smoke tests. OTP sessions use a separate Redis namespace from previous password sessions; users sign in again.

For rollback, stop new writes first, preserve records saved since cutover, then reopen the old portal. Do not restore an old spreadsheet backup over new submissions without reconciliation. Reverting code does not undo data changes.


## Feature parity release

The restored Apps Script interface features require deploying the React bundle and Node API together. No new environment variables or spreadsheet columns are required, and the email-only Apps Script relay is unchanged. After deployment verify Admin/PIC cards and filters, reviewer progress, rank totals/columns, unranked-first sorting, guideline dialogs, justification Add/View/Edit and read-only View, all-ranks removal, and Help/role guides. See [parity report](apps-script-parity-review.md).
