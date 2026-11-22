# Sprint 2: Requests, availability, messaging, and daily planning

This increment extends Sprint 1 on `sprint-2/requests-and-messaging`. The [verification report](SPRINT-2-REPORT.md) separates executed checks from outstanding work.

## Scope and decisions

Technicians publish a profile, service city, services, and dated availability. Customers choose a technician, start a private conversation, and request an available slot. Pending requests reserve their slots. Acceptance confirms the appointment; decline or cancellation frees the slot. Technicians review requests in a daily agenda. The interactive map is optional and deferred for this sprint.

Before acceptance, technicians receive approximate locations. Exact addresses and coordinates belong to the customer and are available to the assigned technician while the request is accepted or completed. Cancellation revokes further exact-location access. Access controls cannot retract information a recipient previously saw.

Publishing a profile does not verify a license. Photos, payments, password recovery, license-review tools, external calendar synchronization, and route optimization are deferred.

## Local setup

Requires Node.js 22 or newer, npm, and Docker Desktop with its engine running. PowerShell users can use `npm.cmd` and `npx.cmd` for the commands below.

1. Run `npm ci`, then `npm run db:start`. Initial startup downloads Docker images and applies local migrations.
2. Apply new migrations to an existing local instance with `npx supabase migration up --local`. Use `npm run db:reset` only when intentionally erasing and rebuilding disposable local data.
3. If not already configured, copy `.env.example` to ignored `.env.local`. Use the local URL and publishable key from `npx supabase status`, plus `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`.
4. Leave `NEXT_PUBLIC_MAPBOX_TOKEN` unset to use the request list. If enabling interactive maps later, set a Mapbox public token, then restart the dev server or rebuild. Restrict the token to the application URLs before publishing maps.
5. Run `npm run dev` and open http://127.0.0.1:3000. Keep the terminal running.

Open the local email inbox at http://127.0.0.1:54324 to confirm new accounts. Use separate browser profiles for a customer and a technician. Appointment inputs use the browser's local timezone; database timestamps use UTC.

Local Supabase was configured for this checkout during implementation. Its values remain in ignored environment files. A fresh clone still needs the setup above; no hosted Supabase account is required for local testing.

## Maps and limitations

Mapbox GL JS provides the map, point selection, and request markers. Pending requests use approximate area markers; authorized accepted appointments can use exact points. Users select locations themselves; this increment does not geocode addresses or store third-party geocoding results.

The request list is the Sprint 2 workflow. Customers enter latitude and longitude when creating a request. Interactive rendering remains unverified and can be evaluated if maps are enabled in a future increment.

The marketplace currently fetches a complete authorized snapshot. Pagination and large-history performance are future work. There is no automated route ordering or travel-time calculation.

## Demonstration

1. Register and confirm a technician and a customer.
2. As the technician, publish a profile and add a future slot.
3. As the customer, filter by the technician's service city, start a conversation, and request the slot with a problem description, address, and location.
4. Confirm the technician sees only an approximate location while the request is pending.
5. Exchange text messages and reload to check that history persists.
6. Accept the request; choose its date in the technician's daily agenda and check exact-address access. With a configured token, also inspect the map.
7. Cancel the request; verify the slot becomes free and the technician can no longer retrieve the exact address.
8. Check that an unrelated account cannot read the request or conversation.

## Architecture and protection

The browser uses same-origin Next.js route handlers. Server handlers validate the confirmed session and inputs, then call PostgreSQL functions with the user's Supabase session. The application does not need a service-role key.

| Record                | Purpose and access                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `profiles`            | Private account identity and immutable role; users read their own profile                   |
| `technician_profiles` | Directory-facing technician name, city, introduction, services, and accepting-requests flag |
| `availability_slots`  | Dated technician slots; overlapping active slots are rejected                               |
| `service_requests`    | Private customer/technician request, reserved slot, status, and approximate location        |
| `request_locations`   | Exact location separated from ordinary request data                                         |
| `conversations`       | One private conversation per customer/technician pair                                       |
| `messages`            | Persisted text messages visible only to conversation participants                           |

SQL functions and row-level security independently enforce roles, participant membership, slot reservation conflicts, request transitions, and private-location access. Requests and conversations retain their original participants. Slot locking and uniqueness rules protect against simultaneous bookings.

`GET /api/marketplace` returns a role-aware snapshot of directory profiles, slots, participant requests, conversations, and messages. Responses are private and uncacheable.

`POST /api/marketplace` supports `saveProfile`, `addSlot`, `removeSlot`, `request`, `requestAction`, `conversation`, and `message`. Mutations require the configured site origin, a confirmed session, and a database profile. Invalid input returns 400; unauthenticated access 401; forbidden actions 403; booking conflicts 409; message rate limits 429; unavailable service 503.

The message limit is 2,000 characters and 30 messages per sender per minute. The database publishes message inserts to Supabase Realtime; the workspace subscribes and refreshes authorized data. A five-second polling fallback refreshes visible workspaces. Sending a message does not expose a participant's entire private account profile.

## Validation

Run `npm run lint`, `npm test`, `npm run build`, then `npm run typecheck`. Build generates Next.js route types needed by the existing environment declaration.

Run `npx playwright install chromium`, then `npm run test:e2e` for desktop/mobile navigation, keyboard use, network-failure handling, route protection, and axe checks. Run `npm run db:test` for SQL policies and booking constraints against local Supabase.

For `npm run test:e2e:auth`, create ignored `.env.test.local` with the same public Supabase/site variables and the **local** `SUPABASE_SERVICE_ROLE_KEY`. This privileged key is used only by test processes to create and remove isolated fixture users. Never prefix it with `NEXT_PUBLIC_`, commit it, or include it in screenshots or shared logs. The browser-facing application server does not receive this key from the test configuration.

The auth configuration rejects non-local Supabase URLs and fails explicitly when required configuration is missing. Confirmation tests submit real signups and read local Mailpit emails, with an Inbucket fallback. Marketplace tests use uniquely named local fixture users to exercise login, cookies, concurrent booking, private messages, database isolation, cancellation, and logout. Fixture-created confirmed users are separate from email-delivery coverage.

Automatic private authentication traces, screenshots, and videos are disabled. The UI journey may deliberately save screenshots containing only synthetic test data for visual review. Test fixtures are deleted during cleanup; test emails may remain in the disposable local inbox until reset.

The GitHub workflow defines lint, unit, build, type, and public browser checks for pushes and pull requests. Manual dispatch can additionally run an isolated Docker/Supabase integration job. No hosted credentials are required. Workflow configuration does not itself prove a remote run passed; consult the [report](SPRINT-2-REPORT.md).

## Deployment preparation

Deployment remains deferred. Before publishing:

- Configure hosted Supabase with migrations, email confirmation, a minimum 12-character password, production SMTP, and the confirmation template.
- Set the actual application origin and redirect URLs, and configure hosting environment variables.
- Enable Realtime for messages and verify participant isolation in the deployed environment.
- If publishing interactive maps, set a restricted Mapbox public token and verify rendering, keyboard access, and location privacy.
- Repeat account, booking-conflict, private-data, mobile, accessibility, and production performance checks.
- Define support, license-review, retention, and account-deletion procedures before treating the app as a public marketplace.

Back up records before migrations. Prefer forward database fixes to destructive rollback; reverting an application deployment must not drop customer data. Never loosen private-table policies to hide an application error.
