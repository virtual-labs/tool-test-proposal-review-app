# Local verification

Verified on 4 November 2026 during the documentation audit. These results apply to the local checkout, not the deployed application.

## Passed

- npm run lint: ESLint passed.
- npm test: all 23 Node tests passed. Coverage includes Sheets adapters and heading normalization, Redis locks, OTP lifecycle/rate limits, sessions/origins, role restrictions, drafts and assistant handoff, submissions, rankings, sanitized diagnostics, mail relay signing and private-file isolation.
- npm run test:ui: all 10 headless Edge tests passed against the local built application with fabricated Sheets, Redis and mail data. Coverage includes all role screens, OTP flows, draft/submission flows, rankings/justification dialogs, PDF download, session recovery, filters, mobile layout and original portal visual tokens.
- Production build passed as part of test:ui: Node API imports and relay source/manifest validation, followed by Vite bundling.

The browser visual reference is committed at tests/browser/fixtures/original-portal.css and loaded relative to the test module. The suite no longer reads ../src/appscript/index.html, which is absent in a standalone GitHub checkout.

The relay tests execute Apps Script locally with mocked Google services. They verify HMAC interoperability, duplicate guards, invalid requests, quota/cap handling and uncertain delivery; they do not verify real MailApp execution. The PDF checks use fabricated data and do not establish correct rendering of every historical review or language.

The test-only inbox is defined in tests/ui-server.js. Production private-file isolation is tested; real API responses do not expose OTPs. MANUAL_CONFIGURATION.md remains intentionally gitignored.

## Not run in this audit

- Live Sheets schema/access, Redis execution, Apps Script authorization or actual OTP/confirmation delivery. No live records were edited.
- GitHub Actions or Vercel deployment verification, environment inspection, domain availability/assignment, live latency or concurrent load.
- Fresh manual visual inspection of PDFs with representative multilingual names and long historical comments.
- Dependency security audit or revalidation of historical source-manifest hashes.
- TypeScript typecheck: no typecheck script is configured; this project uses JavaScript/JSX.

The user has reported GitHub pushes and a Vercel deployment. Their current remote status was not checked here. The requested vlabs-proposal-review.vercel.app hostname is not confirmed as configured. Local test success is not deployment evidence. Follow [deployment acceptance checks](deployment.md) for the actual target environment.

## Login failure diagnostics

For PORTAL_SERVER_ERROR, inspect stage, name and optional code, missingVariable and upstreamStatus. Raw messages, stacks, request bodies, OTPs and credentials are deliberately excluded. configuration indicates environment validation; ERR_INVALID_URL indicates an invalid URL setting. otp-request includes Redis coordination; google-sheets-user-lookup points to Google authentication, Sheets access or Users schema. A TypeError alone does not establish a cause. Check URL values for surrounding quotes/whitespace and redeploy after changing environment variables.

## Historical evidence

The 29 October migration/parity checks and their earlier test counts are historical; the totals above supersede them for this checkout. See [the historical parity report](apps-script-parity-review.md).

An earlier read-only live check recorded trailing spaces in Users headings Name, Email and Status, followed by a successful normalized Users read with no queued writes. The adapter trims heading whitespace and rejects duplicate normalized headings. That historical result is not a fresh check of the current spreadsheet or full OTP login.

See [current features](current-features.md) for the implemented interface, role access, downloads and spreadsheet import conventions.
