> Historical planning document. This is the original proposal, preserved for scope reference. Statements below about implementation or test status describe the proposal stage, not the current repository. See [the README](../README.md) and [Sprint 2 report](SPRINT-2-REPORT.md) for current behavior and verification.

# HVAC Connect

A planned web application connecting homeowners with freelance HVAC technicians in their city.

**Author:** Maximiliano Perez

**Project status:** Proposal and planning. Application code, tests, and deployment have not been created. “HVAC Connect” is a working project name.

## Project overview

This project aims to help freelance HVAC technicians promote their services and receive local house-call requests while giving homeowners more options for finding qualified professionals.

Customers will be able to describe an HVAC problem, attach photos, and send a service request to a technician. Technicians will review requests and accept or decline jobs. Private messaging, job status updates, and saved service history will help both parties manage each request from submission to completion.

## Planned features

### Customers

- Create an account, sign in, and recover a password.
- Browse technician profiles, services, service areas, availability, and licensing information.
- Submit service requests with descriptions and photos.
- Exchange private messages and photo attachments with technicians.
- Receive in-app notifications for messages and request updates.
- Track job statuses and view previous requests and conversations.

### Technicians

- Create a professional profile and submit licensing information for review.
- Manage offered services, service areas, and availability.
- View incoming requests and approximate job locations on a map.
- Accept or decline requests and update accepted jobs as work progresses.
- Communicate with customers and view job history.

### Administration

- Review technician licensing information and record its review status.
- Review reported accounts, messages, and service issues.
- Manage account access when necessary.

## Proposed technology stack

| Area                 | Technology                                           | Purpose                                               |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Frontend             | React, Next.js App Router, TypeScript                | Pages, dashboards, and application interactions       |
| Styling              | Tailwind CSS, shadcn/ui                              | Responsive, accessible interface components           |
| Backend              | Next.js Route Handlers, Zod                          | Business rules, request validation, and API endpoints |
| Database             | Supabase PostgreSQL, PostGIS                         | Persistent records and location-based searches        |
| Authentication       | Supabase Auth                                        | Accounts, sessions, and password recovery             |
| Authorization        | PostgreSQL row-level security and server-side checks | Customer, technician, and administrator permissions   |
| Messaging            | Supabase Realtime and PostgreSQL                     | Live updates with persistent message history          |
| File storage         | Supabase Storage                                     | Private problem photos and message attachments        |
| Maps                 | Mapbox GL JS, Mapbox Geocoding API                   | Map display and address-to-location conversion        |
| Database development | Supabase client, SQL migrations                      | Data access and versioned schema changes              |
| Testing              | Vitest, React Testing Library, Playwright, axe-core  | Logic, interface, browser, and accessibility tests    |
| Hosting              | Vercel, Supabase                                     | Application and managed backend hosting               |
| Development tools    | GitHub, GitHub Actions, ESLint, Prettier             | Version control, automated checks, and formatting     |
| Monitoring           | Sentry                                               | Application error tracking                            |

## Core workflow

1. A customer creates an account and selects a technician serving their area.
2. The customer submits a problem description, photos, and a service location.
3. The technician reviews the request and its approximate location, then accepts or declines it.
4. After acceptance, the assigned technician can access the exact service address.
5. The customer and technician communicate through private messaging.
6. The technician updates the job status, and both users retain access to their history.

## Data and privacy requirements

Planned records include user profiles, technician services and credentials, service requests, job status history, conversations, messages, attachments, notifications, and issue reports.

- Restrict conversations, photos, and job details to authorized participants and administrators with a justified support need.
- Keep precise customer addresses out of public profiles and general job maps.
- Use private file storage, controlled attachment access, and upload size and type validation.
- Enforce permissions in the backend and database, alongside interface controls.
- Store secrets outside source control and document required configuration before deployment.
- Define credential review, data retention, and account deletion procedures before launch. Submitting licensing information alone will not mark a technician as verified.

## Development roadmap

Development will follow the Universal Full-Stack Builder's 17-phase workflow. All phases are currently **not started**.

| Phase | Planned work                                                                   |
| ----- | ------------------------------------------------------------------------------ |
| 1     | Repository scaffold, Git conventions, formatting, and initial automated checks |
| 2     | Database schema, migrations, data access, and sample records                   |
| 3     | Authentication, account recovery, and role-based permissions                   |
| 4     | Validated backend endpoints and service-request business rules                 |
| 5     | Frontend routing, layouts, dashboards, and data fetching                       |
| 6     | Accessible, responsive forms and loading, empty, and error states              |
| 7     | Frontend/backend integration and live messaging                                |
| 8     | Photo uploads, maps, location search, and notifications                        |
| 9     | Core workflow visibility and error monitoring                                  |
| 10    | Account settings, technician profiles, and administrator review tools          |
| 11    | Browser test infrastructure and isolated test accounts                         |
| 12    | Customer/technician journeys, edge cases, mobile, and accessibility tests      |
| 13    | Security review, dependency checks, and performance improvements               |
| 14    | Deployment checks, environment separation, and migration safeguards            |
| 15    | Setup instructions, architecture documentation, and operational guides         |
| 16    | Production deployment, secrets configuration, and rollback planning            |
| 17    | Live-site verification, smoke tests, monitoring, and handoff                   |

## Local setup and validation

The application is not runnable yet. Installation commands, environment variable names, database setup, and development scripts will be documented when the project is scaffolded.

No tests have been run and no live deployment is available. Planned validation covers account access, cross-user privacy, request submission, acceptance and decline, persistent messaging, photo permissions, location privacy, mobile layouts, and keyboard accessibility.

## Initial scope

The first release will focus on accounts, technician profiles, service requests, messaging, photos, maps, and job history. Payments, public ratings, automated license verification, and native mobile apps are outside the initial scope.
