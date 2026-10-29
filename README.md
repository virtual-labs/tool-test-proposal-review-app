# Virtual Labs Proposal Review — React + Node.js

The existing proposal review workflows, rebuilt with **React and Vite** on the frontend and a **Node.js API** for Vercel. Application data stays in Google Sheets. Login uses **email OTP** rather than passwords.

## Architecture

Browser → React interface → same-origin Node.js `/api` → Google Sheets API.

- React components: login, workspace cards, sortable tables, filters, review forms, assistant handoff, monitoring, rankings, downloads and help.
- Required Google Sheets tabs: Users, Proposals, Completed Reviews and Draft Reviews. Ranks and justification are stored in Completed Reviews; a separate Rankings tab is not required or read.
- Redis REST: short-lived OTP challenges, resend cooldowns, rate limits, two-hour sessions and cross-instance write coordination.
- Standalone Apps Script MailApp relay: sends OTP emails and final-review confirmations through signed server requests. See [relay setup](apps-script-email/README.md).
- PDFKit: submitted-review PDFs. Existing role/ownership restrictions remain enforced on the server.

Apps Script is used only for email delivery. The application UI and API run on Vercel; no Cloudflare proxy, credential spreadsheet or password provisioning is required. Historical password credentials are not read; no external spreadsheet is deleted or changed automatically.

## Local setup

Use Node.js 22 or 24, with the same major selected in Vercel.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and fill in server-side configuration. Initially use a **test copy** of the existing application spreadsheet and a separate test Redis database.

| Variable | Required value |
|---|---|
| `APP_ORIGIN` | Exact origin, e.g. `http://127.0.0.1:3000` locally; HTTPS on Vercel |
| `GOOGLE_SPREADSHEET_ID` | Application spreadsheet ID |
| `GOOGLE_CLIENT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Private key; literal `\n` separators are supported |
| `REDIS_REST_URL` | HTTPS Redis REST endpoint supporting commands and EVAL |
| `REDIS_REST_TOKEN` | Redis REST authorization token |
| `OTP_SECRET` | Random server secret, at least 32 characters |
| `MAIL_RELAY_URL` | Apps Script web app HTTPS /exec URL |
| `MAIL_RELAY_SECRET` | Matching Script Property; random, at least 32 characters, distinct from OTP_SECRET |
| `PORT` | Optional local port; default 3000 |

Generate an OTP secret locally; do not commit or share its output:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Enable the Google Sheets API in your Google Cloud project. Share the test spreadsheet with the service account as an editor. Preserve existing sheet names/headers and optional historical columns. Users must appear exactly once in `Users`, be active, and have a valid name/role. They sign in with that registered email.

Create and authorize the standalone email relay following [the step-by-step relay guide](apps-script-email/README.md). Deploy it as the sender account with access Anyone, protected by signed requests. It needs no separate sending-domain setup. Google account mail quotas apply; default relay cap is 80 attempts/day and five recipients are reserved from Google quota.

```sh
npm run sheets:check
npm run dev
```

Open `http://127.0.0.1:3000`. `npm run dev` runs the Node API and Vite React development middleware on the same port. Local development permits Vite's refresh bootstrap; built production assets retain a stricter script policy.

For a local production build:

```sh
npm run build
npm start
```

The detailed local checklist is `MANUAL_CONFIGURATION.md`, intentionally excluded by `.gitignore`. It is a workspace-only document and will not accompany a clone or push. It contains configuration steps and status, not secret values.

## OTP behavior

- Six-digit cryptographically random code, valid for ten minutes and accepted once.
- Each challenge is tied to the email and random challenge ID; only an HMAC digest is stored in Redis.
- Latest challenge only; requesting a replacement invalidates older codes.
- Sixty-second resend cooldown; maximum five attempts per challenge.
- Request limits: 5/email/hour, 10/IP/15 minutes, 100 globally/hour. Verification limits: 15/email/hour and 30/IP/15 minutes.
- Unknown/inactive emails get the same public message without an email being sent. This is response-content protection; timing differences from sending mail are not claimed to be eliminated.
- Delivery failures invalidate that challenge and log only a sanitized failure category. The public response remains generic; check Apps Script Executions and recipient spam folders if no code arrives.
- Account status and active role are rechecked through Sheets on authenticated application requests. Role switching rotates the session without extending its original expiry. Logout revokes the current session.
- Old password-authentication sessions use a different Redis namespace and cannot authenticate to the OTP application.

## Restored interface features

The React app includes the finalized ranking guidelines, justification dialogs, role-specific user guides, login troubleshooting, filtered ranking totals, serial-number columns and unranked-first sorting. Admin/PIC monitoring uses Reviewed and Pending cards; pending includes saved drafts while draft answers remain private. See [the parity report](docs/apps-script-parity-review.md) for details and verification.

## Verification

```sh
npm run lint
npm test
npm run test:ui
```

`test:ui` builds the React production bundle, then runs headless browser tests against a local fixture server. Tests use fabricated users, spreadsheets, Redis and a test-only mail inbox. **The real application has no inbox endpoint, fixed OTP, or development login bypass.**

Edge is the default browser. For Chrome set `PLAYWRIGHT_CHANNEL=chrome`; install the chosen browser if needed. The CI workflow installs Chrome. Screenshots and browser artifacts are written under ignored `test-results/`.

This project uses JavaScript/JSX; no TypeScript typecheck is configured. See `docs/verification.md` for observed results and remaining external checks.

## Vercel deployment

Import this repository in Vercel with framework preset **Other**, install command `npm ci`, build command `npm run build`, and output directory **dist**. `vercel.json` routes `/api` to `api/index.js` and sets a 60-second function budget.

Configure all required variables separately for Preview and Production. Set `APP_ORIGIN` to the exact intended deployment URL, then redeploy. Do not use `VITE_` prefixes for server credentials. Follow `docs/deployment.md` before switching real users over.

Official references: [React with Vite](https://react.dev/learn/build-a-react-app-from-scratch), [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js), [Sheets batching](https://developers.google.com/workspace/sheets/api/guides/batch).

## Limits and operational notes

- Sheets API quotas/latency remain. No performance improvement is claimed without live measurements.
- Redis locks coordinate this application, not manual spreadsheet edits or the old portal. Do not run old and new applications as concurrent writers against the same live sheet.
- Sheets updates are one atomic batch with retries disabled. An ambiguous write retains its lock for up to four minutes; refresh and inspect saved state before retrying.
- Unsaved review/ranking edits can be recovered in the same tab after session expiry when the same account signs in. Closing/reloading loses unsaved in-memory edits. Navigation warns before discarding changes.
- A failed confirmation email does not undo a saved review. There is no automatic email retry queue.
- Email OTP is single-factor authentication, not MFA. Mailbox access controls account access.
- PDFKit's built-in fonts have limited non-Latin support. Visually validate real names and multilingual/long comments before release; embed licensed Unicode fonts if required.
- Source provenance hashes for the untouched original application are in `docs/source-manifest.json`.
