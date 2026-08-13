# Email Security & Password Reset Delivery

This document covers two independent problems that together break the password
reset experience:

1. **Scanner-safe token flow** — email security scanners (Gmail, Brave Safe
   Browsing, anti-virus link previews) prefetch the reset link and burn the
   single-use Supabase recovery token before the user clicks.
2. **Domain authentication (SPF / DKIM / DMARC)** — missing/misconfigured DNS
   records cause Gmail to flag reset emails as "might be dangerous".

---

## 1. Scanner-safe password reset flow

### The problem

Supabase recovery tokens are **single-use**. The default Supabase reset email
puts the raw confirmation URL directly as the link `href`:

```
https://smartjotter.com/reset-password?type=recovery&token_hash=…&…
```

Email clients and security scanners routinely **prefetch / pre-visit** links to
scan them (Gmail's anti-phishing, Brave Safe Browsing, anti-virus link
previews, Slack/Teams unfurlers). That prefetch hits the confirmation URL,
exchanges the token, and invalidates it. By the time the real user clicks,
they see **"This password reset link is invalid or has expired."**

### The fix: intermediate landing page + URL fragment

The confirmation URL is **never placed directly in the email link**. Instead:

1. The email links to an intermediate page: `/reset-password/start`.
2. The real Supabase confirmation URL is passed inside the **URL fragment**
   (the part after `#`):

   ```
   https://smartjotter.com/reset-password/start#confirm=<confirmation URL>
   ```

   URL fragments are **never sent to servers** and **never fetched** by
   scanners — they exist only in the browser. So a scanner loading the
   intermediate page sees only inert HTML with no token to consume.

3. The intermediate page (`frontend/app/reset-password/start/page.tsx`) reads
   `window.location.hash` client-side, shows a **"Reset Password"** button,
   and **only redirects to the real confirmation URL on a genuine user click**.

4. That redirect lands on `/reset-password` (the real recovery destination),
   Supabase exchanges the token, and the normal flow continues.

### Required Supabase configuration

#### a) Email template (Dashboard → Auth → Email Templates → "Reset Password")

Replace the default link with the scanner-safe version. The default template
links directly to `{{ .ConfirmationURL }}`. Change it to:

```html
<a
  href="{{ .SiteURL }}/reset-password/start#confirm={{ .ConfirmationURL }}"
>
  Reset password
</a>
```

Notes:

- `{{ .SiteURL }}` resolves to the **Site URL** configured in
  *Dashboard → Auth → URL Configuration* (set it to `https://smartjotter.com`).
- `{{ .ConfirmationURL }}` is the full Supabase confirmation URL including the
  recovery `token_hash`. Putting it in the fragment keeps it out of any server
  logs and safe from prefetching.
- The intermediate page decodes the fragment tolerantly (handles both
  URL-encoded and raw URLs across email clients).

#### b) Redirect URLs (Dashboard → Auth → URL Configuration)

The **final** destination (`/reset-password`) must be in the allow-list. Add:

```
https://smartjotter.com/reset-password
```

(Also keep any staging/preview URLs you use, e.g.
`https://smart-jotter.vercel.app/reset-password`.)

> The intermediate `/reset-password/start` route does **not** need to be in
> the redirect-URL list — it is never used as a Supabase `redirectTo`; it is
> linked to directly from the email template.

#### c) `resetPasswordForEmail` redirect target (app code)

`frontend/lib/auth/auth-context.tsx` still passes `redirectTo = <origin>/reset-password`
to `supabase.auth.resetPasswordForEmail(...)`. This is correct: it tells
Supabase what the **final** destination is, which becomes part of
`{{ .ConfirmationURL }}`. The code comment there explains the flow.

### Code locations

- `frontend/app/reset-password/start/page.tsx` — intermediate landing page
  (reads fragment, shows button, redirects on click).
- `frontend/app/reset-password/page.tsx` — final destination (unchanged;
  shows the "set new password" form after Supabase exchanges the token).
- `frontend/lib/auth/auth-context.tsx` — `resetPassword()` still targets
  `/reset-password` as the Supabase `redirectTo` (final destination).

---

## 2. Domain authentication (SPF / DKIM / DMARC)

Gmail flags the reset emails as "might be dangerous" when the sending domain
lacks proper authentication. These records are configured in **DNS** for
`smartjotter.com` (managed wherever the domain's nameservers live) and verified
in the **Resend dashboard → Domains → smartjotter.com**.

### Current state (live DNS check as of the fix date)

| Record | Host | Status |
|---|---|---|
| **SPF** (TXT) | `smartjotter.com` | ❌ **MISSING** — apex has no `v=spf1` record |
| **DKIM** (TXT) | `resend._domainkey.smartjotter.com` | ✅ Present (valid public key) |
| **DMARC** (TXT) | `_dmarc.smartjotter.com` | ⚠️ Present but `p=none` (no enforcement) |

**The missing SPF record is the most likely cause of Gmail flagging the
emails.** Without SPF, Gmail cannot verify that Resend (which sends via AWS
SES) is authorized to send on behalf of `smartjotter.com`, so it treats the
mail as unauthenticated/suspicious.

### Required DNS records

> Exact values are shown in the **Resend dashboard** under
> *Domains → smartjotter.com → DNS records*. Always copy from there — the
> DKIM key in particular is unique to your account. The records below are the
> standard Resend setup.

#### SPF (TXT) — **add this; it is currently missing**

```
Type:  TXT
Host:  smartjotter.com   (apex — i.e. "@")
Value: v=spf1 include:amazonses.com ~all
TTL:   3600 (or default)
```

Resend sends through Amazon SES, so the SPF record must `include:amazonses.com`.
Use `~all` (softfail) initially; once delivery is stable you may switch to
`-all` (hardfail) for stricter enforcement. If you already send mail from
other providers (e.g. Google Workspace), merge their `include:` before the
`all` mechanism — you can only have **one** SPF TXT record per host.

> ⚠️ **Do not create multiple SPF TXT records.** If one already exists for
> other services, edit it to add `include:amazonses.com` rather than adding a
> second record. Multiple SPF records invalidate SPF entirely.

#### DKIM (TXT) — already present, verify in Resend

```
Type:  TXT
Host:  resend._domainkey.smartjotter.com
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...  (long public key from Resend)
```

DKIM is present in DNS. Confirm it shows a green **Verified** checkmark in the
Resend dashboard. If Resend shows a different selector or key, update the
record to match exactly.

#### DMARC (TXT) — present but recommend strengthening

Currently:

```
Type:  TXT
Host:  _dmarc.smartjotter.com
Value: v=DMARC1; p=none;
```

`p=none` is monitor-only (reports are sent but no mail is rejected). This is
fine as a starting point, but once SPF + DKIM are verified and you've reviewed
aggregate reports, tighten it:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@smartjotter.com;
```

…and eventually `p=reject` for maximum enforcement. Add a `rua=` address
(consider a free DMARC reporting service) to receive aggregate reports and
catch any legitimate mail that fails authentication.

### Verification

1. Add/fix the **SPF** record at the apex in your DNS provider.
2. In the **Resend dashboard → Domains → smartjotter.com**, click
   **Verify DNS records** (or "Re-verify"). All three (SPF, DKIM, DMARC)
   should turn green.
3. Re-check DNS propagation (may take minutes to an hour):

   ```bash
   # SPF (apex TXT) — should now show v=spf1 ...
   nslookup -type=TXT smartjotter.com 8.8.8.8

   # DMARC
   nslookup -type=TXT _dmarc.smartjotter.com 8.8.8.8

   # DKIM
   nslookup -type=TXT resend._domainkey.smartjotter.com 8.8.8.8
   ```

4. Send a test reset email and inspect the **Authentication-Results** header
   (e.g. via Gmail "Show original"): `spf=pass`, `dkim=pass`, and `dmarc=pass`
   should all be present.

### Summary of action items

- [ ] **Add SPF TXT record** at `smartjotter.com` apex:
      `v=spf1 include:amazonses.com ~all`
- [ ] Verify DKIM shows green in the Resend dashboard.
- [ ] (Recommended) Strengthen DMARC from `p=none` to `p=quarantine` and add a
      `rua=` reporting address once delivery is confirmed clean.
- [ ] Re-verify the domain in the Resend dashboard.
- [ ] Configure the Supabase reset email template per section 1.