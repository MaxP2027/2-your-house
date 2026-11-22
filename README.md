# HVAC Connect

A web application connecting homeowners with independent HVAC technicians in their city.

**Author:** Maximiliano Perez

**Current increment:** Sprint 2 on `sprint-2/requests-and-messaging`. Local development only; no production deployment has been performed.

## What works in this increment

- Customer and technician registration, email confirmation, login, and logout.
- Technician profiles, service-city filtering, and dated availability.
- Private appointment requests that reserve a slot until accepted, declined, or cancelled.
- Technician request management and a daily agenda.
- Persistent private text conversations, with Realtime refresh and a five-second polling fallback.
- Approximate job locations before acceptance; exact addresses available to the assigned technician while accepted or completed.

Sprint 2 uses the request list and daily agenda. Customers enter location coordinates manually. Interactive maps are deferred and can be enabled later with a Mapbox public token. Profiles do not represent verified licenses.

Photos, payments, password recovery, license review, calendar integrations, and route optimization are deferred. See the [Sprint 2 guide](docs/SPRINT-2.md) and [phase/verification report](docs/SPRINT-2-REPORT.md). The [original proposal](docs/PROJECT-PROPOSAL.md) records the wider intended product.

## Start the app

Requires Node.js 22 or newer, npm, and Docker Desktop with its engine running. In PowerShell:

```powershell
cd "C:\Users\maxcp\OneDrive\Desktop\Projects\2-your-house"
npm.cmd ci
npm.cmd run db:start
```

For an existing local database, apply new migrations with `npx.cmd supabase migration up --local`. Avoid `db:reset` unless you intend to erase and rebuild disposable local data.

If `.env.local` is not already configured, copy [.env.example](.env.example) to `.env.local` and use values from `npx.cmd supabase status`:

| Variable                               | Purpose                                          |
| -------------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Local API URL, normally `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Local publishable key                            |
| `NEXT_PUBLIC_SITE_URL`                 | `http://127.0.0.1:3000` for this local setup     |
| `NEXT_PUBLIC_MAPBOX_TOKEN`             | Optional public token for interactive maps       |

Keep private environment files out of Git. Never use a Supabase service-role key in a `NEXT_PUBLIC_` variable.

```powershell
npm.cmd run dev
```

Open **http://127.0.0.1:3000** and keep the terminal running. Confirm new accounts through the local email inbox at **http://127.0.0.1:54324**. The local database dashboard is at **http://127.0.0.1:54323**. Use separate browser profiles for a customer and a technician.

## Technology

Next.js App Router, React, TypeScript, CSS/Tailwind, Zod, Supabase Auth/PostgreSQL/Realtime, and Mapbox GL JS. SQL migrations and row-level security enforce permissions independently of the interface. Dependencies are pinned in `package.json` and `package-lock.json`.

## Checks and production build

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run typecheck
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run db:test
```

Build before type-checking on a fresh checkout so Next.js generates route types. For real local account/booking tests, configure the ignored `.env.test.local` as described in the [test guide](docs/SPRINT-2.md#validation), then run `npm.cmd run test:e2e:auth`.

`npm.cmd run build` and `npm.cmd run start` serve a local production build. [GitHub Actions](.github/workflows/ci.yml) checks pushes and pull requests. On Sprint 2 pushes it also tests against isolated Supabase and deploys the homepage preview after both jobs pass and deployment secrets are available. Executed results and remaining verification are recorded in the [report](docs/SPRINT-2-REPORT.md).

## Structure

- `src/app/`: homepage, account pages, protected dashboard, and API handlers.
- `src/components/marketplace/`: discovery, requests, profile/availability, messages, and map UI.
- `src/lib/`: validation, response types, authentication, and Supabase clients.
- `supabase/migrations/`: account and marketplace schema/policies.
- `supabase/tests/database/`: SQL authorization and booking assertions.
- `tests/`: unit, public browser, and real local account/marketplace checks.
- `docs/`: scope, setup, verification, and deployment preparation.

## Deployment and rollback

### Google Cloud homepage preview

`cloudbuild.yaml` builds the Linux image, pushes it to Artifact Registry, and deploys it to Cloud Run. Run this from the project root after enabling the Cloud Build, Artifact Registry, and Cloud Run APIs and creating the Docker repository `hvac-app` in `us-central1`. The Cloud Build service account needs permission to write to that repository, deploy to Cloud Run, use the Cloud Run runtime identity, and write build logs.

```powershell
gcloud builds submit --project=hvac-app-515123 --region=us-central1 --config=cloudbuild.yaml --substitutions="_DEPLOY_MODE=preview,_SERVICE=hvac-app-preview" .
```

The preview serves the homepage with account operations unavailable. It uses a separate `-preview` service, with Cloud Run's default authenticated access for a new service. `.gcloudignore` and `.dockerignore` limit build inputs to application source and build files.

### Automatic preview deployment from GitHub

On a push to `sprint-2/requests-and-messaging`, GitHub Actions runs both the application checks and the isolated Supabase suite. The deploy job submits `cloudbuild.yaml` only after both jobs pass and the deployment secrets are present. It deploys `hvac-app-preview` with authenticated access and records its URL in the Actions run summary.

One-time setup in Google Cloud project `hvac-app-515123`:

1. Enable Cloud Run, Cloud Build, Artifact Registry, and IAM Service Account Credentials. Create a standard Docker repository named `hvac-app` in `us-central1` and a private Cloud Storage bucket named `hvac-app-515123-github-build-source` for staging uploads.
2. Create `github-actions-deployer`. Grant Cloud Build Editor, Cloud Run Developer, and Logs Writer on the project. Grant Artifact Registry Writer on the `hvac-app` repository and Storage Admin on the staging bucket only. Grant Service Account User to the deployer on its own identity (to submit builds as itself) and the Cloud Run runtime identity (`986702390468-compute@developer.gserviceaccount.com` for this project).
3. Create a JSON key for that account and put it directly into the GitHub Actions repository secret `GCP_SA_KEY`. Set `GCP_PROJECT_ID` to `hvac-app-515123` and `GCP_REGION` to `us-central1`. Keep the JSON file outside the repository and out of chat.
4. Push to the Sprint 2 branch or rerun a previous Sprint 2 push workflow after completing setup. Open the workflow summary for the deployment result. Pull request runs do not deploy.

### Full application

For a full deployment, use `_DEPLOY_MODE=full` and pass `_SUPABASE_URL`, `_SUPABASE_PUBLISHABLE_KEY`, and `_SITE_URL` as build substitutions. Use the hosted project's publishable key and the final HTTPS application origin. Configure hosted Supabase migrations, email confirmation/SMTP, and redirect URLs before verifying signup, booking, and messaging. If enabling maps later, configure a restricted Mapbox token and verify map behavior separately.

Back up records before applying migrations. Roll back application code separately from data; use forward database fixes when possible and never drop customer data as an automatic rollback. See [deployment preparation](docs/SPRINT-2.md#deployment-preparation).
