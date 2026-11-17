# Sprint 1 implementation status

Work is on `sprint-1/homepage-and-accounts`. This is an in-progress implementation, not a completed release.

## Commit sequence and purpose

1. **chore: establish Next.js project tooling** — Add the framework, TypeScript, styling setup, environment template, lint/format configuration, and dependency lockfile so development is reproducible.
2. **feat(db): add private account profiles** — Add automatic validated profile creation, immutable customer/technician roles, own-profile read policies, and SQL authorization tests.
3. **feat(auth): implement confirmed-email account access** — Add Supabase SSR sessions, validated authentication endpoints, email confirmation and resend configuration, origin checks, and protected account lookup.
4. **feat(ui): add homepage and account journey** — Add responsive navigation, role-aware registration links, account forms, confirmation help, and the protected dashboard.
5. **docs: record setup and verification status** — Document local setup and the remaining acceptance work.

## Verified on November 16, 2026

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; all agreed routes were generated.
- Source was formatted with Prettier. TOML formatting is not supported by the installed formatter.
- No private environment files are committed.

## Remaining work

- Configure and start local Supabase with Docker, apply the migration, and run `npm run db:test`.
- Execute real registration, confirmation, login, refresh, logout, and cross-user isolation checks.
- Add the missing Vitest and Playwright configuration/suites. Their package scripts are reserved but are not currently usable test suites.
- Verify mobile rendering, keyboard navigation, accessibility, and performance.
- Complete CI, error boundaries, deployment preparation, and the 17-phase acceptance report.
- Address observed failures before merging. No deployment has been performed.

The current commits preserve meaningful progress; passing lint and build does not establish authentication correctness.
