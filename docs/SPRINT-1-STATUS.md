# Sprint 1 implementation status

Sprint 1 introduced the homepage and account access on `sprint-1/homepage-and-accounts`. Sprint 2 builds on those changes on `sprint-2/requests-and-messaging`; see the [current guide](SPRINT-2.md) and [verification report](SPRINT-2-REPORT.md).

## Original commit sequence and purpose

1. **chore: establish Next.js project tooling** — Framework, TypeScript, styling, environment template, lint/format setup, and dependency lockfile.
2. **feat(db): add private account profiles** — Validated automatic profile creation, immutable customer/technician roles, own-profile policies, and SQL tests.
3. **feat(auth): implement confirmed-email account access** — Supabase sessions, validated account endpoints, confirmation/resend, origin checks, and protected account lookup.
4. **feat(ui): add homepage and account journey** — Responsive navigation, role-aware registration links, account forms, confirmation help, and protected dashboard.
5. **docs: record setup and verification status** — Local setup and the acceptance work still outstanding at that time.

## Verification carried forward

Lint, TypeScript, and production build checks passed during Sprint 1. The original handoff left real account, database, browser, and accessibility checks pending.

During Sprint 2, local Docker/Supabase was configured and the account migration was applied. The combined SQL suite passed 48 assertions, including 15 account-profile assertions. Real email signup/confirmation tests passed for both account roles. Public browser checks covered desktop/mobile navigation, role selection, keyboard access, route protection, and automated accessibility checks.

Vitest and Playwright now have executable suites, and a GitHub Actions workflow has been added. These supersede the earlier statement that test scripts were only reserved placeholders. See the current report for the final verification state and outstanding map verification.

No production deployment has been performed. Password recovery remains outside this increment.
