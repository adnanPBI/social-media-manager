# Real Platform Integration Guide

The hybrid MVP ships in **mock publishing mode** so the full product workflow can be tested without platform approvals.

## Why mock mode remains necessary

Real publishing requires:

- Developer app creation
- OAuth callback configuration
- App review/approval
- Platform-specific scopes
- Eligible business/professional accounts where required
- Media and caption policy compliance
- Rate-limit handling

Do not promise live production posting until those external prerequisites are complete.

## Current integration surface

Mock adapter location:

```text
apps/api/src/modules/platforms/adapters/mock-social.adapter.ts
```

Adapter factory:

```text
apps/api/src/modules/platforms/adapters/adapter.factory.ts
```

The rest of the app talks only to this adapter contract:

```ts
validateContent(payload): Promise<ValidationResult>
publishPost(payload): Promise<PublishResult>
fetchAnalytics(platformPostId): Promise<AnalyticsResult>
```

## OAuth scaffolding

The hybrid exposes:

```text
GET /api/platforms/:platform/connect-url
GET /api/platforms/:platform/callback
```

In mock mode, the UI uses the local mock-connect button. In real mode, the connect-url endpoint builds the platform authorization URL from `.env` values.

## Required environment variables

```text
PUBLISHING_MODE=real
PUBLIC_BASE_URL=https://api.yourdomain.com
WEB_BASE_URL=https://dashboard.yourdomain.com

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=https://api.yourdomain.com/api/platforms/facebook/callback
INSTAGRAM_REDIRECT_URI=https://api.yourdomain.com/api/platforms/instagram/callback

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=https://api.yourdomain.com/api/platforms/twitter/callback

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://api.yourdomain.com/api/platforms/tiktok/callback
```

## Production work still needed for real posting

1. Replace mock adapter publish logic with concrete API calls.
2. Implement callback token exchange per platform.
3. Encrypt and store access/refresh tokens.
4. Implement token refresh.
5. Implement exact media upload/publish flows per platform.
6. Implement platform-specific analytics endpoints.
7. Add production tests using sandbox/test accounts.

## Suggested rollout order

1. Facebook Page publishing
2. Instagram professional account publishing
3. X/Twitter text and media publishing
4. TikTok video publishing
5. Platform-specific analytics hardening

## Important platform caveat

The app can trigger a publish API call at the scheduled time. Public visibility, analytics freshness, and exact available metrics still depend on each platform.
