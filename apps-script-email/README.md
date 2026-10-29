# Email-only Google Apps Script relay

## Setup

This is a NEW standalone email-only project. React and Node stay on Vercel; Sheets remains the database and Redis handles OTP verification and sessions. The relay only sends OTP and submission-confirmation messages. It requests permission to send mail, not read your inbox. Messages are sent as the Google account that authorizes and owns the deployment; the Sheets service account is separate.

### 5.1 Create and authorize the relay

1. Sign in to the approved Google sender account and open [Apps Script](https://script.google.com/). Create a **New project** named for this portal's TEST email relay. Do not replace the original application's script.
2. Replace the new project's Code.gs contents with this repository's apps-script-email/Code.gs and save.
3. Open **Project Settings**, enable **Show appsscript.json manifest file in editor**, and replace that manifest with apps-script-email/appsscript.json. Save. Its only explicit OAuth scope is script.send_mail.
4. Generate a private random secret locally using the command below. Generate a different value from OTP_SECRET; never put its actual value in source code or this guide.

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

5. In **Project Settings → Script Properties → Add script property**, add MAIL_RELAY_SECRET with that value. Save it privately for the Node environment too.
6. Optionally add RELAY_DAILY_LIMIT, an integer from 1 to 1000. Default is 80 send attempts per Asia/Kolkata calendar day, including OTPs and confirmations and failed send attempts. This cap does not increase Google's quota. The relay also stops when Google reports five or fewer recipients remaining. Other scripts using the same sender share Google's account quota.
7. Return to the editor, select **verifyRelaySetup**, and click **Run**. Review and authorize the send-mail permission as the intended sender. Follow your organization's consent policy; if approval is blocked, contact the administrator. This function checks setup and reports remaining recipient quota; it sends no email.

### 5.2 Deploy the web app

1. Select **Deploy → New deployment → Select type → Web app**.
2. Set **Execute as: Me** (the sender account), and **Who has access: Anyone**. The Node server cannot complete an interactive Google login. If your organization does not allow Anyone, this implementation is blocked until an approved deployment/access approach is available.
3. Click **Deploy**, complete authorization if prompted, and copy the web app URL ending in /exec. Do not use the editor, library, test /dev URL or redirected response URL.
4. Open that /exec URL in a private browser window. It should show service name/version JSON without asking for a Google login. This GET check proves access only; it does not prove sending works.
5. Set MAIL_RELAY_URL to this /exec URL and MAIL_RELAY_SECRET to the matching Script Property in .env.local and later in the appropriate Vercel environment. Never use VITE_ prefixes, query parameters or browser code for the secret.
6. Complete the application's real OTP login test using a registered TEST mailbox. Check spam and sender identity. A successful MailApp call is not a guarantee of inbox delivery.

The public endpoint verifies HMAC-SHA256 signed requests, a two-minute timestamp window and single-recipient input before sending. It stores request IDs for 24 hours, serializes sends, and refuses automatic retries after uncertain delivery. It does not store OTP challenges or verify login codes. Protect the secret: anyone possessing it can request mail within the relay limits. Signed bodies contain email content; never log them.

### 5.3 Updates, quotas and troubleshooting

- After changing Code.gs or the manifest, use **Deploy → Manage deployments → Edit → Version: New version → Deploy** to update the existing deployment. Merely saving editor code does not update deployed code. Keep the existing /exec URL or update MAIL_RELAY_URL and redeploy Vercel if creating a new deployment.
- Rotate the relay secret in Script Properties and the corresponding local/Vercel environment together, then redeploy Node and test. In-flight requests may fail during rotation. Keep OTP_SECRET distinct.
- Use a separate TEST relay project and secret from production. Using the same Google owner still shares the owner's Google quotas; a separate project does not create extra quota.
- Inspect **Apps Script → Executions** for execution failures and run verifyRelaySetup for remaining quota. The service intentionally returns sanitized errors and does not log OTP bodies. Do not add body logging. Check Vercel's sanitized OTP_DELIVERY_FAILED category too.
- HTML/login responses: check access is Anyone and the URL ends in /exec. Rejected signatures: check both secret values exactly. QUOTA_UNAVAILABLE: inspect remaining Google quota and RELAY_DAILY_LIMIT. RELAY_BUSY: avoid simultaneous bursts. DELIVERY_UNCERTAIN: inspect recipient delivery before any manual action; the service will not resend that request ID.
- Node waits up to 15 seconds and does not automatically retry. A timed-out OTP challenge is invalidated even if an email arrives late; wait for the 60-second cooldown and request a new code.
- No Resend account, sending API key or new email-domain DNS setup is required. The Google sender account must remain authorized and comply with institutional mail policy. Website domain setup remains optional and separate.

Official references: [Web app deployment](https://developers.google.com/apps-script/guides/web), [MailApp permissions and quota](https://developers.google.com/apps-script/reference/mail/mail-app), [Google quotas](https://developers.google.com/apps-script/guides/services/quotas), [ContentService redirects](https://developers.google.com/apps-script/guides/content).

- [ ] Separate email-only script created and copied from this repository.
- [ ] Script Properties configured and verifyRelaySetup authorized.
- [ ] Execute as Me / Anyone deployment created and /exec access checked.
- [ ] Matching relay URL and secret configured privately in Node.
- [ ] Real OTP and confirmation delivery tested; account quota reviewed.

