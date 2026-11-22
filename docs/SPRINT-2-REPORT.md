# Sprint 2 implementation and verification report

Verified locally on November 19, 2026, on the approved `sprint-2/requests-and-messaging` branch of `MaxP2027/2-your-house`. The account, scheduling, and messaging increment works locally. The request list and daily agenda are the Sprint 2 planning workflow. Interactive maps are deferred by request. Production deployment remains deferred.

## Delivered behavior

| User story                                                     | Result                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Technician can navigate requests and plan the day              | Role-aware navigation, request filters, dated agenda, and map integration                                 |
| Technician can understand household problems through messaging | Private text conversations before or after booking, saved history, Realtime refresh, and polling fallback |
| Customer can find technicians and request appointments         | Service-city filtering, profiles, available slots, messages, and appointment requests                     |

Customers choose technicians privately. A pending request reserves its slot. Acceptance confirms an appointment; decline/cancellation releases the slot. Exact locations are stored separately and disclosed only to authorized participants. Completion becomes available once an accepted appointment starts. An expired or revoked session clears private workspace data and sends unauthenticated users to login.

## Executed verification

| Check                                        | Result                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                               | Passed                                                                                                                                                                                                      |
| `npm test`                                   | Passed: 22 unit tests in 2 files                                                                                                                                                                            |
| `npm run build`                              | Passed: optimized production build                                                                                                                                                                          |
| `npm run typecheck`                          | Passed after the build generated route types                                                                                                                                                                |
| `npm run db:test`                            | Passed: 48 SQL assertions across account and marketplace suites                                                                                                                                             |
| `npm run test:e2e`                           | Passed: 16 desktop/mobile public-page tests against the production preview                                                                                                                                  |
| `npm run test:e2e:auth`                      | Passed: 4 real local Supabase tests                                                                                                                                                                         |
| `npm audit --audit-level=high`               | Passed: 0 reported vulnerabilities                                                                                                                                                                          |
| Dashboard visual review                      | Reviewed synthetic-data desktop agenda and mobile messaging screenshots                                                                                                                                     |
| Lighthouse 13.6.0, local production homepage | Mobile performance 100, accessibility 100; LCP 0.8 s, CLS 0, TBT 70 ms                                                                                                                                      |
| GitHub Actions                               | Application job passed for `ea8d1d5`. [GitHub Actions run](https://github.com/MaxP2027/2-your-house/actions/runs/44576561145). The optional Supabase CI job was skipped on push. Its suites passed locally. |
| Live Mapbox rendering                        | Deferred. Request list and manual-coordinate booking verified locally.                                                                                                                                      |
| Hosted deployment / live smoke test          | Not performed; deployment deferred                                                                                                                                                                          |

The four local integration tests cover real signup/confirmation emails for both roles; concurrent booking, private data and messaging through the API; and the full two-role browser journey. The UI journey publishes a profile and slot, finds the technician, exchanges messages, submits and accepts a booking, checks the agenda and message persistence, and verifies logout clears private data from another open tab. Dashboard axe checks pass on the tested desktop and mobile views.

A browser timeout exposed an ambiguous appointment-select label; an accessibility check exposed conflicting navigation styles. Both were corrected before the successful run. Two fixture users left by the interrupted test were removed explicitly; successful runs clean up their fixture users. Local inbox emails may remain.

Lighthouse is one local synthetic run, not a production performance guarantee. Automated accessibility checks do not establish complete WCAG conformance. Realtime is configured and the workspace subscribes to private message inserts; the browser tests verify message delivery/persistence with the five-second polling fallback enabled, not a separate websocket-only guarantee.

## Seventeen-phase tracking

Statuses apply to the agreed sprint scope, not every capability in the original proposal.

| Phase                                                  | Status                            | Evidence or remaining gate                                                                           |
| ------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Scaffold, Git conventions, formatting, initial CI   | Implemented                       | Pinned dependencies, focused commits, check workflow; remote CI tracked below                        |
| 2. Domain model, schema, migrations, data access       | Verified locally                  | Typed marketplace contract, transactional SQL/RLS, 48 passing SQL assertions                         |
| 3. Authentication, sessions, role authorization        | Verified for sprint scope         | Real confirmed-email accounts and immutable roles; password recovery deferred                        |
| 4. Domain services, validated APIs, error semantics    | Verified locally                  | Role-aware API, slot conflicts, request transitions, message limits                                  |
| 5. Routing, layouts, data fetching, state              | Verified locally                  | Protected customer/technician workspaces and session-expiry behavior                                 |
| 6. Accessible responsive UI and application states     | Verified on tested views          | Loading/empty/error feedback, desktop/mobile review and axe checks                                   |
| 7. Frontend/API integration and Realtime               | Implemented and locally exercised | Full booking/messaging journey passes; polling remains a fallback                                    |
| 8. Application-specific advanced features              | Partially complete                | Map integration awaits token-based verification; photos and route optimization deferred              |
| 9. Workflow visibility and observability               | Implemented for sprint scope      | Agenda, statuses, refresh/error feedback; hosted monitoring deferred                                 |
| 10. Settings, profiles, administration                 | Implemented for sprint scope      | Technician profiles and availability; administration/license review deferred                         |
| 11. Browser infrastructure and isolated fixtures       | Verified locally                  | Playwright configurations, local-only guard, real email tests, cleanup                               |
| 12. Cross-role, failure, mobile, accessibility tests   | Verified locally                  | 20 browser/integration tests plus unit and database coverage                                         |
| 13. Security, dependencies, performance                | Verified within local scope       | Privacy/concurrency checks, zero audit findings, measured homepage performance                       |
| 14. CI/CD gates and environment safeguards             | Configured                        | Ignored credentials, automated application job, optional isolated integration job; no deployment job |
| 15. Setup, architecture, API/database, operations docs | Delivered                         | Current README, sprint guide/report, environment template, archived original proposal                |
| 16. Production deployment and rollback                 | Deferred                          | Deployment preparation and non-destructive migration guidance documented                             |
| 17. Live checks, monitoring, handoff                   | Local handoff only                | No public deployment; live checks require a later deployment                                         |

## Commit sequence and purpose

| Commit                                      | Purpose                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `22a048a`                                   | Pin dependencies and prepare reproducible Sprint 2 tooling                                     |
| `ebc21d7`                                   | Add private requests, separate precise locations, atomic reservations, and SQL policy tests    |
| `b0f21fb`                                   | Connect authenticated booking/messaging APIs, validation, session refresh, and local Realtime  |
| `c885078`                                   | Add responsive discovery, scheduling, agenda, private chat, map fallback, and session clearing |
| `ea8d1d5`                                   | Add unit/browser/local integration coverage and GitHub Actions checks                          |
| Documentation commit containing this report | Record verified behavior, setup, scope, limitations, and local handoff                         |

The code/testing commits through `ea8d1d5` were pushed to the approved branch. No merge or deployment was performed. Each commit includes its purpose and relevant validation.

## Remaining configuration and launch work

- If interactive maps are enabled in a later increment, configure `NEXT_PUBLIC_MAPBOX_TOKEN` in ignored `.env.local`, restart or rebuild, and verify map selection, markers, keyboard access, and location privacy.
- Before public launch, configure hosted Supabase/SMTP/origins, apply reviewed migrations, and complete the [deployment checks](SPRINT-2.md#deployment-preparation).
- Photos, payments, password recovery, license verification, calendar synchronization, route optimization, pagination, and large-history performance are outside this increment.

## Local handoff

The [README](../README.md) contains PowerShell startup commands. Local Supabase uses ignored environment files; no hosted account is required for this demonstration. Start Docker Desktop, run `npm.cmd run db:start` if services are stopped, then `npm.cmd run dev`. Open `http://127.0.0.1:3000`; confirm new accounts in Mailpit at `http://127.0.0.1:54324`.

Playwright artifacts and the Lighthouse JSON remain under ignored `test-results/`. Private automatic traces/screenshots are disabled; deliberate UI screenshots contain synthetic fixtures only. The temporary production preview is stopped after verification so it does not occupy the user's development port.
