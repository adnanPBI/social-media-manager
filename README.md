# Social Media Manager Hybrid MVP

Hybrid build after surgical analysis of the Claude ZIP and the previous NestJS MVP.

The final package keeps the locked stack:

| Layer | Tech |
|---|---|
| Front end | React + Vite + TypeScript |
| Back end | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Queue | Redis + BullMQ |
| Charts | Recharts |
| Calendar | FullCalendar |
| File storage | Local upload by default, S3/MinIO-ready contract |
| Reports | Playwright PDF + CSV exporter |
| Deployment | Docker Compose, plus cPanel UI deployment notes |

## Why this is hybrid

Claude's ZIP had useful product ideas but used the wrong backend/calendar/report stack for this client requirement:

- Express backend instead of NestJS
- react-big-calendar instead of FullCalendar
- pdfkit instead of Playwright

Those were not copied. The useful features were ported into the NestJS/React Vite architecture:

- Redis sliding-window rate limiter per platform/account
- Quota bars on the Accounts page
- Media upload with image/video validation and 200MB limit
- Draft → pending approval → approved workflow
- Approved CMS webhook endpoint
- Queue metrics endpoint
- Reschedule fix that removes old BullMQ delayed jobs
- First analytics sync after publishing
- Five-minute recurring analytics sync
- Follower growth snapshots
- OAuth connect URL scaffolding for real integrations

## Important implementation note

This MVP runs end-to-end locally in **mock publishing mode**. Real Facebook, Instagram, X/Twitter, and TikTok publishing requires approved developer apps, OAuth credentials, scopes, account eligibility, and platform review/audit. The adapter layer is ready so real adapters can replace mock behavior without rewriting the UI, calendar, queue, analytics, or reports.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Open:

- UI: http://localhost:5173
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/docs

Seed login:

```text
Email: admin@example.com
Password: Admin@12345
```

Optional MinIO:

```bash
docker compose --profile storage up --build
```

## Main user flow

1. Open Accounts and mock-connect Facebook, Instagram, X/Twitter, and TikTok.
2. Open Content and create content as approved, or send approved content to `/api/webhooks/cms/approved-content`.
3. Open Calendar, pick approved content, choose a time, and schedule to all connected platforms.
4. Drag a calendar event to reschedule.
5. Click a calendar event to publish now.
6. Open Dashboard to see queue state, publishing results, analytics, follower growth, and post-level status.
7. Open Reports and download CSV/PDF exports.

## Acceptance mapping

| Client requirement | Hybrid support |
|---|---|
| Connect accounts in under two minutes | Mock flow works immediately; production OAuth URL route exists for real mode. |
| Approved content appears on calendar instantly | Approved UI flow and `/api/webhooks/cms/approved-content` are implemented. |
| Publish at scheduled time | BullMQ delayed jobs trigger worker at scheduled time; old jobs are removed on reschedule. |
| Respect API rate limits | Redis sliding-window quota per platform/account. |
| Dashboard updates within five minutes | First analytics job after publish + recurring five-minute sync. |
| CSV/PDF match screen metrics | Dashboard and exports use latest analytics snapshots. |

## Important reality check

The app can trigger the API call at the exact scheduled time. It cannot guarantee that Facebook, Instagram, X/Twitter, or TikTok will display the post publicly at that exact millisecond because platform-side processing is outside the app.

## Project structure

```text
social-media-manager-hybrid/
  apps/
    api/        NestJS API, Prisma, BullMQ worker, media, reports
    web/        React Vite dashboard with FullCalendar and Recharts
  docs/
    SURGICAL_ANALYSIS.md
    CLIENT_ACCEPTANCE_CHECKLIST.md
    CPANEL_DEPLOYMENT.md
    REAL_PLATFORM_INTEGRATION.md
  docker-compose.yml
  .env.example
```

## Useful endpoints

```text
POST /api/auth/login
GET  /api/platforms
GET  /api/platforms/accounts
POST /api/platforms/mock-connect
GET  /api/platforms/:platform/connect-url
GET  /api/platforms/accounts/:id/quota
POST /api/media/upload
POST /api/webhooks/cms/approved-content
GET  /api/content
POST /api/content/approved
POST /api/schedule
POST /api/schedule/:id/reschedule
POST /api/schedule/:id/publish-now
GET  /api/analytics/overview
GET  /api/publishing/queue-metrics
GET  /api/reports/export.csv
GET  /api/reports/export.pdf
```
