Camper Van Rentals — Supabase Auth email templates
====================================================

These HTML files are NOT sent automatically by the Next.js app. You apply them
in the Supabase Dashboard (hosted) or via supabase/config.toml (local CLI).

1) BRANDED TEMPLATE (Confirm signup)
   - Dashboard: Project → Authentication → Email Templates → "Confirm signup"
   - Subject (suggested): Confirm your email — Camper Van Rentals
   - Body: paste the full contents of confirm-signup.html

   Go template variables must stay exactly as written, especially:
   {{ .ConfirmationURL }}

2) OPTIONAL — same styling for other flows
   - "Reset password" → reset-password.html (subject e.g. Reset your password — Camper Van Rentals)
   - "Magic link" → magic-link.html (subject e.g. Your sign-in link — Camper Van Rentals)

3) FROM ADDRESS: support@campervansrental.com
   Supabase’s built-in email always shows as their domain (e.g. noreply@mail.app.supabase.io).
   To send FROM support@campervansrental.com you MUST enable Custom SMTP:

   Dashboard → Authentication → SMTP Settings → Enable custom SMTP

   Use any SMTP provider that supports your domain (Resend, SendGrid, Postmark,
   AWS SES, etc.). Add their host, port, user, and password.

   Set:
   - Sender email: support@campervansrental.com
   - Sender name: Camper Van Rentals   (or similar)

   At your DNS / email provider, add SPF and DKIM (and DMARC when ready) for
   campervansrental.com so mail is delivered and not marked as spam.

   Docs:
   https://supabase.com/docs/guides/auth/auth-smtp
   https://resend.com/docs/send-with-supabase-smtp  (example for Resend)

4) LOCAL SUPABASE CLI
   If you use `supabase start`, add to supabase/config.toml:

   [auth.email.template.confirmation]
   subject = "Confirm your email — Camper Van Rentals"
   content_path = "./supabase/email-templates/confirm-signup.html"

   Then restart: supabase stop && supabase start

5) AUTH EMAIL BEST PRACTICES
   Keep auth emails short, few links, and transactional. See:
   https://supabase.com/docs/guides/auth/auth-smtp (section on reputation)
