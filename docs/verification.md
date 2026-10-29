# Local verification — React + OTP migration

Updated and verified locally on 29 October 2026.

## Passed

- Email-only relay change: Node signs HMAC-SHA256 envelopes; the standalone Apps Script source is executed locally in a VM with mocked Google services. Tests cover signature interoperation, Unicode messages, duplicate sends, stale/forged requests, quota/daily caps, busy locks, uncertain delivery and response validation. Submission-confirmation failure preserves saved reviews; retries do not resend. These are simulations, not evidence of live Google execution.
- Build checks the Apps Script source syntax and manifest JSON. Production HTTP tests reject downloads of relay source/manifest; built frontend contains neither relay configuration variable.
- Detailed ignored configuration guide and tracked apps-script-email/README.md explain authorization, Script Properties, execute-as-owner / Anyone deployment, matching server configuration, quotas and updates.

- Rankings-tab correction: the loader and schema checker require only Proposals, Users, Completed Reviews and Draft Reviews. Test fixtures omit Rankings entirely and reject requests for absent tabs. All 19 backend/API/relay tests, lint and the production build pass with this four-tab schema; existing rank save/generation/justification tests exercise Completed Reviews. No live sheet was created or deleted.

- `npm run lint`: Node/JavaScript/JSX lint and React hook checks.
- `npm run build`: Node syntax/import checks and a Vite production React bundle in dist/.
- `npm test`: 19 tests passed. Covers OTP delivery through a fake mailer, HMAC-only storage, expiry, cooldown, maximum attempts, latest-code behavior, wrong-email binding, concurrent replay, rate limits, disabled users, session/cookie/origin behavior, logout, roles, drafts, assistant handoff, submissions, ranking, PDF bytes, Sheets batches, write uncertainty, and private-file isolation.
- `npm run test:ui`: five headless Edge workflows against the built React bundle and actual local Node HTTP API using fabricated Sheets/Redis/mail data. Covers OTP login, invalid code handling, drafts, final submissions, manual and generated rankings, justifications, PDF download, PIC switching, session restoration, admin filters/sorting/mobile layout, assistant handoff and unsaved-work recovery after expiry.
- Development-server smoke check: root and transformed React entry return 200; the ignored manual setup guide is blocked with 403.
- Production-server tests: manual setup guide, environment files, backend source, test source and test-only mailbox return 404.
- `git check-ignore -v MANUAL_CONFIGURATION.md`: matches the explicit .gitignore rule. The local setup guide is not included in ordinary Git adds/pushes.
- Original application source hashes match docs/source-manifest.json; original files remain unchanged.
- Dependency installation completed with zero reported vulnerabilities for the installed tree. An optional React lint plugin was omitted because its peer range did not support the existing ESLint version; no force/legacy-peer-deps override was used.
- Visually inspected the React mobile admin dashboard screenshot. Tables stay within scrollable containers.

## Blocked external check

`npm run sheets:check` was attempted. It cannot connect because .env.local is absent and required APP_ORIGIN/configuration values are missing. No Google, Redis or email credentials were supplied, inferred, or copied from the old application.

## Not verified

- Real Google Sheets API access/schema, Redis REST/EVAL execution, Apps Script deployment/authorization, Google MailApp execution or actual OTP email delivery.
- Vercel routing/function packaging, preview/production deployment, real service quotas, live latency and representative concurrent load.
- GitHub Actions execution; the workflow exists locally and has not run remotely.
- TypeScript typecheck; this project uses JavaScript/JSX.
- Visual review of PDFs containing real multilingual names/comments or unusually long historical data. PDF generation and browser downloads are tested with fabricated data.

The test-only inbox is defined exclusively in tests/ui-server.js. Production imports never include it; no fixed code or login bypass exists. OTP codes are never returned by the real API or logged by the application.

The implementation is local, uncommitted and unpushed. Vercel configuration is prepared but nothing has been deployed. No live spreadsheets, sender accounts or existing deployments were modified. Follow the ignored MANUAL_CONFIGURATION.md checklist for manual setup, then execute the live acceptance checks in docs/deployment.md.


### Login failure diagnostics

If Vercel logs PORTAL_SERVER_ERROR, inspect stage, name, optional code, missingVariable and upstreamStatus. Raw messages, stacks, request bodies, OTPs and credentials are deliberately excluded. configuration indicates environment validation; ERR_INVALID_URL indicates a URL setting cannot be parsed. otp-request includes Redis coordination; google-sheets-user-lookup indicates Google authentication, Sheets access or Users schema. A TypeError alone does not establish a cause. After deploying updated code, retry once and inspect the new entry. Check URL values for surrounding quotes or whitespace, and redeploy after changing environment variables.

Diagnostic update: lint, build and 20 backend tests passed locally. Existing five browser workflows passed before this logging-only update; they were not rerun for it. The production login root cause remains unverified until the new deployment logs are available.
