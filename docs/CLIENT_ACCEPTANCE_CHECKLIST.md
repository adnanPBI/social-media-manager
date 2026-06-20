# Client Acceptance Checklist

## 1. Account connection under two minutes

MVP mode:
- Use the Accounts page and click **Mock connect** for each platform.
- This demonstrates the full connection/account status flow without requiring external API credentials.

Production mode:
- Set `PUBLISHING_MODE=real`.
- Add developer credentials in `.env`.
- Use `/api/platforms/:platform/connect-url` to generate OAuth links.
- Implement token exchange inside the real adapter after platform app approval.

Risk:
- The two-minute target is realistic only after platform apps are approved and callback URLs are correctly configured.

## 2. Approved content appears on the scheduling calendar instantly

Supported paths:
- Create content as approved in the UI.
- POST approved CMS content to `/api/webhooks/cms/approved-content`.
- Approved items appear in the calendar scheduling panel.

Calendar behavior:
- FullCalendar is used.
- Drag-and-drop rescheduling calls `/api/schedule/:id/reschedule`.
- Rescheduling removes the old BullMQ delayed job before creating the new one.

## 3. Publishes at the exact scheduled time

What the system controls:
- BullMQ delayed job triggers the API publish worker at the scheduled time.
- Worker validates each platform variant.
- Rate limits are checked before publish.
- Failed platforms do not block successful platforms.

External limitation:
- Final public visibility can depend on the platform processing time. The app guarantees the scheduled API trigger, not third-party display latency.

## 4. Dashboard updates within five minutes

Supported:
- First analytics job is queued shortly after publishing.
- Worker runs recurring analytics sync every five minutes by default.
- Follower snapshots are also collected.

Config:
- `FIRST_ANALYTICS_DELAY_MS=60000`
- `ANALYTICS_SYNC_INTERVAL_MS=300000`

## 5. Downloadable reports match dashboard metrics

Supported:
- Dashboard and CSV/PDF exports use the same latest analytics snapshot model.
- CSV: `/api/reports/export.csv`
- PDF: `/api/reports/export.pdf`
- PDF generation uses Playwright.
