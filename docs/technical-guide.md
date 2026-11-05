# Technical Guide

Reviewed against repository source on 5 November 2026. This is a code and maintenance reference, not confirmation of live service configuration or deployment.

## 1. Architecture and service boundaries

The frontend uses React and Vite; the backend uses Node.js ES modules. Google Sheets is the persistent application database. Redis REST provides OTP/session state, rate limits and write coordination. A separately deployed Google Apps Script service sends email only.

```text
Browser / React
    | same-origin POST /api + session cookie
Node.js API (Vercel)
    |-- Google Sheets API: users, proposals, drafts, final reviews/ranks
    |-- Redis REST: OTPs, sessions, limits and locks
    |-- signed HTTPS POST: Apps Script MailApp email relay
    `-- PDFKit: authorised submitted-review PDFs
```

Apps Script is not hosted in Vercel. Vercel stores its deployment URL in MAIL_RELAY_URL and the signing secret in MAIL_RELAY_SECRET. The matching secret is set in Apps Script Script Properties. The browser never receives these credentials. There is no Cloudflare proxy or password database in this implementation.

## 2. Source map

| Path | Responsibility |
|---|---|
| client/App.jsx | Application state, navigation and role screens. |
| client/components/ | Login, dashboards, forms, tables, dialogs and review views. |
| client/api.js | JSON RPC transport, URL validation, rating definitions and form payload helpers. |
| client/hooks.js | Shared React hooks. |
| client/guide-content.js | In-app role instructions. |
| client/styles.css | Shared portal styling. |
| client/table-sort.js | Table ordering helpers. |
| api/index.js | Vercel API entry point. |
| src/http.js | HTTP validation, cookies, authentication/action dispatch and error responses. |
| src/config.js | Required environment variables and configuration validation. |
| src/auth.js | OTP challenges, verification and sessions. |
| src/coordination.js | Redis REST commands, rate limits and write locks. |
| src/service.js | Per-request Sheets reads, authorised domain calls, commits, PDF/email orchestration. |
| src/domain.js | Role/ownership rules, schema, drafts, handoff, reviews and rankings. |
| src/sheets.js | Sheets snapshots, cell conversion and queued atomic writes. |
| src/email.js | Signed relay envelope and delivery acknowledgement validation. |
| src/pdf.js / src/time.js | Review PDFs and time formatting. |
| src/diagnostics.js / src/errors.js | Sanitised diagnostics and expected application errors. |
| src/server.js / src/app-server.js | Local Node server, Vite middleware and compiled static-file serving. |
| apps-script-email/ | Standalone MailApp relay source, manifest and setup guide. |
| scripts/build.js / scripts/check-sheets.js | Production build checks and live read-only schema check. |
| tests/ / tests/browser/ | Node tests and Playwright workflows with fabricated services. |
| vercel.json | Build/output settings, API rewrite, function budget and security headers. |

## 3. Local development

Use Node.js 22 or 24 (package engines: >=22 <25). Keep the same major version in deployment.

1. Run npm ci.
2. Copy .env.example to .env.local and supply server-side values from the [README configuration table](../README.md#local-setup). Local scripts load .env.local; they do not automatically load .env.
3. Use a test spreadsheet copy and dedicated test Redis/email relay.
4. Run npm run sheets:check when ready to check real Google access/schema. This requires configured credentials and is separate from fixture tests.
5. Run npm run dev; open http://127.0.0.1:3000 unless PORT was changed. APP_ORIGIN must match.
6. For local production mode, run npm run build then npm start.

Required configuration: APP_ORIGIN, GOOGLE_SPREADSHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, REDIS_REST_URL, REDIS_REST_TOKEN, OTP_SECRET, MAIL_RELAY_URL and MAIL_RELAY_SECRET. PORT is optional. Both secrets must be at least 32 characters and must differ. GOOGLE_CLIENT_EMAIL is the service-account email; share the spreadsheet with it as editor and enable Sheets API access. Literal backslash-n separators in the private key are supported.

APP_ORIGIN is one exact origin, HTTPS outside local development. Do not prefix backend secrets with VITE_. Environment files and MANUAL_CONFIGURATION.md are gitignored; the private manual does not accompany a fresh clone. Tracked setup instructions are in the README and [email relay guide](../apps-script-email/README.md).

## 4. API contract and request flow

The API accepts POST /api with Content-Type application/json and a body shaped as:

```json
{"action":"session","args":[]}
```

Success: {"ok":true,"result":...}. Failure: {"ok":false,"error":"..."} with an HTTP error status. Body size is limited to 65,536 bytes. Requests are checked against APP_ORIGIN, except the unauthenticated session probe can return authenticated:false before configuration is loaded.

| Category | Actions |
|---|---|
| Authentication | requestOtp, verifyOtp, session, switchRole, logout |
| Reads | getInitialData, getProposal, getReview, downloadReview, getAdminProposals, getAdminUsers, getAdminData, getAssistantReview, getRankingData, getAdminRankings |
| Writes | saveDraft, submitToLdc, submitReview, autoRankProposals, saveRankJustification, saveRankings |

The write actions are saveDraft, submitToLdc, submitReview, autoRankProposals, saveRankJustification and saveRankings. Existing domain RPC calls retain a legacy first argument slot; service.js substitutes an internal cookie marker and uses the server session as the principal. Do not treat a client-supplied identity argument as authentication. Use the existing client calls and domain signatures when extending payloads.

Authenticated domain calls load a fresh snapshot, validate the active user and enforce role/ownership rules. Writes run under a spreadsheet-scoped Redis lock, queue changes, and commit one Sheets batch. Emails are sent after commit; a mail failure does not roll back the review. PDF creation follows authorised review retrieval.

client/api.js retries only its explicit read-action allowlist once on network/server failures. Mutations must not be blindly retried. Expected PortalError messages reach clients; unexpected failures return a generic unavailable message and sanitised server diagnostics.

## 5. Data model and imports

Required tabs are exactly Users, Proposals, Completed Reviews and Draft Reviews. No Rankings tab is read. The authoritative required-header definitions are HEADERS inside createDomain in src/domain.js; scripts/check-sheets.js checks them. Preserve exact names and punctuation. Surrounding header whitespace is trimmed; duplicate normalised headings fail.

| Tab | Contents and relationships |
|---|---|
| Users | Email, name, active status, domain, institute and role; login requires one matching active email record. |
| Proposals | Proposal ID, title/link, domain/institute, reviewer assignments, status and related lab links. |
| Draft Reviews | Draft ID, Proposal ID, reviewer email, Answers JSON, revision/status, role and metadata. |
| Completed Reviews | Review ID, Proposal ID, reviewer identity, submitted timestamp, ratings/comments, role/institute and rank metadata. |

Canonical roles are Admin, PIC, LDC and Assistant Reviewer. Numbered LDC labels are accepted for migration. Assignment and dual-role rules are implemented in domain.js; do not infer access solely from frontend visibility.

Current reviews have eight 1–6 ratings plus comments, Form Version and Rating Maximum. Preserve historical scales/legacy answer columns. Imported Review IDs need not be UUIDs, but should be stable, unique and nonempty; imported uniqueness is not enforced. Completed reviews associate by Proposal ID; avoid duplicate final records for a proposal.

Prefer ISO timestamps with explicit timezone, e.g. 2026-10-14T10:15:28.000Z. Convert local time before adding Z. Native Sheets dates use the spreadsheet timezone; slash-formatted plain text is not parsed as a date. Preserve blanks and confirm source timezone. Display formatting uses IST; recognised table timestamps show date-only with a hover timestamp.

Rank, Rank Justification and Rank Updated At live with completed reviews. Rank Order Mode is optional metadata; changed manual ranks write Manual. It is not a runtime auto-ranking setting. See [current features](current-features.md#spreadsheet-imports) for additional import guidance.

## 6. Domain invariants

- Final reviews are read-only. LDC detailed access/downloads are limited to own submissions; PIC is institute-scoped, Admin monitors globally, and assistants can view assigned final reviews without downloading them.
- Draft ownership/reservation and revision checks protect other reviewers' work. Assistant handoff cannot overwrite an existing LDC draft.
- Each reviewer ranks their own reviewed proposals in their domain. Rank 1 is highest; manual duplicates are rejected. Automatic generation is explicit, sorting the first seven ratings' total descending and Proposal ID ascending. It replaces/saves ranks; reads and final submission do not generate them.
- UI justification edits are staged until Save Rankings. Monitor views cannot edit another person's ranks.
- Admin/PIC pending includes saved drafts while answers stay private. Reviewer-name visibility applies to every authorised View Review user.

## 7. Authentication and email

OTP codes are six digits, valid ten minutes, single use, and stored as HMAC digests bound to email/challenge. New challenges invalidate older ones. Cooldown is 60 seconds, with five attempts per challenge. Request limits are 5/email/hour, 10/IP/15 minutes and 100 globally/hour; verification limits are 15/email/hour and 30/IP/15 minutes. Authenticated requests also have a 180/email/minute limit.

Sessions last two hours in Redis. Production cookies use __Host-vl_session with Secure, HttpOnly, SameSite=Strict and Path=/. Local HTTP uses vl_session. Role switching rotates the session without extending expiry; logout revokes it. User status/role is rechecked. Email OTP is single-factor; unknown accounts receive generic content, but email-delivery timing differences are not eliminated.

Node signs email payloads using HMAC-SHA256, includes a request ID and timestamp, and validates the relay acknowledgement. Apps Script verifies the signature/time window, guards against duplicate delivery and enforces quota/daily limits. It sends OTPs and final-review confirmations; it does not verify login codes or access application data. Follow the [relay setup/update instructions](../apps-script-email/README.md). Saving script editor changes alone does not update the deployed version.

## 8. Consistency, security and limits

Sheets writes are batched with retries disabled. Redis lock ownership is checked before commit. An uncertain write retains its lock for up to four minutes; inspect saved state before retrying. Locks do not coordinate manual spreadsheet edits or another portal writing the same sheet.

The HTTP layer enforces origin, content type, body limits and secure cookies. Security headers restrict framing and script sources. Sheets writes protect against formula injection. Local production serves only compiled assets; private source/configuration and the test inbox are not public application endpoints.

No production performance guarantee follows from fixture tests. Sheets/API quotas, Redis availability, email quotas and Vercel function limits remain operational constraints. No automatic email retry queue exists. PDFKit's built-in fonts have limited non-Latin coverage; validate representative real reviews before release.

## 9. Testing and maintenance

| Command | Purpose |
|---|---|
| npm run lint | ESLint JavaScript/JSX checks. |
| npm test | Node tests covering domain, auth, adapters, relay and server boundaries. |
| npm run build | Node/relay validation and production React bundle. |
| npm run test:ui | Build then Playwright browser workflows against fabricated services. |
| npm run sheets:check | Real configured spreadsheet access/header check. |

No TypeScript typecheck script is configured. Playwright defaults to Edge; PLAYWRIGHT_CHANNEL=chrome selects Chrome. CI installs Chrome. The committed tests/browser/fixtures/original-portal.css reference is module-relative; no sibling Apps Script checkout is needed. Test inbox access exists only in tests/ui-server.js. Never introduce a production fixed OTP or authentication bypass for tests.

Latest recorded execution results and limitations are in [verification.md](verification.md). Documentation changes alone do not establish fresh live verification. When changing workflows, update the browser role guides, this user guide and related tests together; when changing schema/auth/API behaviour, update this technical guide and configuration documentation.

## 10. Deployment and troubleshooting

Vercel configuration builds dist and rewrites /api to api/index.js with a 60-second function budget. Use the repository's documented Other preset, npm ci install and npm run build command; configure Preview/Production separately. Check current platform allowances in the deployment account. The local server's /health only reports that the server is running, not integration health; it is not a separately configured Vercel endpoint.

When changing the canonical domain, confirm its assignment in Vercel, update APP_ORIGIN and redeploy. A hostname change alone does not require replacing the Sheets, Redis or mail-relay credentials. A new relay deployment URL requires updating MAIL_RELAY_URL and redeploying Node.

For PORTAL_SERVER_ERROR, use stage/name and allowlisted code, missingVariable or upstreamStatus. google-sheets-user-lookup narrows investigation to Google authentication, spreadsheet access or Users schema; a TypeError alone does not prove the cause. Do not log OTPs, keys, request bodies or raw upstream responses. Check email relay Executions and quotas for delivery failures.

Before release, run the [deployment acceptance checklist](deployment.md), including real OTP, role access, submissions, rankings, email and PDF checks. Back up data and coordinate writers before cutover. Code rollback does not reverse spreadsheet changes; preserve/reconcile new submissions before restoring data. Actual GitHub/Vercel status and the requested hostname are not verified by this guide.

## 11. Related documentation

- [User Guide](user-guide.md): task instructions for every role.
- [Current features](current-features.md): implemented behaviour and import conventions.
- [Deployment](deployment.md): smoke checks, cutover and rollback.
- [Verification](verification.md): recorded local evidence and external gaps.
- [UI alignment](ui-alignment.md): visual alignment notes.
- [Historical parity report](apps-script-parity-review.md): migration history, not the current release status.
