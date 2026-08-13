# Email Security & Password Reset Delivery

This document covers two independent problems that together break the password
reset experience:

1. **Scanner-safe token flow** — email security scanners (Gmail, Brave Safe
   Browsing, anti-virus link previews) prefetch the reset link and burn the
   single-use Supabase recovery token before the user clicks. (The actual root
   cause of "invalid or expired" links.)
2. **Domain authentication (SPF / DKIM / DMARC)** — verification of the
   Resend domain records. All three are correctly configured; the Gmail
   "might be dangerous" warning is a domain-reputation signal, not a DNS
   problem (see section 2).

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

### Current state (live DNS check as of the fix date)

Resend intentionally splits the DNS records across hostnames by design:
**SPF lives on the `send` subdomain**, **DKIM lives on the root domain**, and
**DMARC lives at `_dmarc`**. This is the standard Resend architecture and is
correctly configured — do **not** add a duplicate SPF record at the apex.

| Record | Host | Status |
|---|---|---|
| **SPF** (TXT) | `send.smartjotter.com` | ✅ Present — `v=spf1 include:amazonses.com ~all` |
| **DKIM** (TXT) | `resend._domainkey.smartjotter.com` | ✅ Present (valid public key) |
| **DMARC** (TXT) | `_dmarc.smartjotter.com` | ✅ Present — `v=DMARC1; p=none;` |

All three authentication records are present and correctly placed per Resend's
architecture. **No DNS changes are required.** Adding an SPF record at the
`smartjotter.com` apex would be redundant — Resend intentionally keeps SPF on
the `send` subdomain.

### About the Gmail "might be dangerous" warning

The Gmail warning on reset emails is **not** caused by missing or
misconfigured DNS records (all auth records are verified above). It is driven
by **domain sending reputation**:

- **New/low-volume sending domains** are treated cautiously by Gmail
  regardless of correct SPF/DKIM/DMARC setup. Gmail flags unfamiliar senders
  as suspicious until it has observed enough legitimate sending volume to
  establish trust.
- The warning **improves over time** with consistent legitimate email volume
  (real password resets being delivered and opened by real users) and a clean
  complaint/bounce rate.

This is separate from — and independent of — the token-bug fix in section 1.
The token fix is the actual root cause of "invalid or expired" reset links;
the Gmail warning is a reputation signal that resolves with sending history.

### Verification commands

To re-confirm the records are still live and correct:

```bash
# SPF (on the send subdomain, NOT the apex)
nslookup -type=TXT send.smartjotter.com 8.8.8.8

# DKIM (on the root domain)
nslookup -type=TXT resend._domainkey.smartjotter.com 8.8.8.8

# DMARC
nslookup -type=TXT _dmarc.smartjotter.com 8.8.8.8
```

Additionally, confirm all three show a green **Verified** checkmark in the
**Resend dashboard → Domains → smartjotter.com**.

### Summary of action items

- [x] SPF verified on `send.smartjotter.com` (do **not** add at apex)
- [x] DKIM verified on `resend._domainkey.smartjotter.com`
- [x] DMARC present at `_dmarc.smartjotter.com` (`p=none` is fine for now)
- [ ] Configure the Supabase reset email template per section 1
- [ ] (Reputation) Continue sending legitimate volume; the Gmail warning
      resolves over time as sending reputation builds
