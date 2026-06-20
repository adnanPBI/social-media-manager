# cPanel deployment guide

## Recommended deployment shape

Use cPanel only for the React UI if your cPanel plan does not provide Redis and long-running Node worker support.

Recommended production layout:

```text
subdomain.yourdomain.com        React Vite static UI on cPanel
api.yourdomain.com              NestJS API on VPS/Node server
worker process                  same VPS/server as API
PostgreSQL 16                   managed DB or VPS
Redis                           managed Redis or VPS
S3/MinIO                        S3-compatible object storage
```

## Build the UI for cPanel

On your local machine/server:

```bash
cd apps/web
npm install
VITE_API_URL=https://api.yourdomain.com/api npm run build
```

Upload the contents of:

```text
apps/web/dist
```

to the cPanel subdomain document root, for example:

```text
public_html/social-dashboard
```

## Required cPanel rewrite file

Create `.htaccess` inside the uploaded `dist` folder:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

This lets React Router-style front-end routes work after refresh.

## API CORS setting

Set this in your backend `.env`:

```text
WEB_BASE_URL=https://subdomain.yourdomain.com
```

The API enables CORS using this value.

## If cPanel supports Node.js apps

Only use cPanel for the API if it supports:

- Node.js 20+
- persistent background workers
- environment variables
- PostgreSQL connection
- Redis connection

Many shared cPanel plans do not support Redis or always-on BullMQ workers. In that case, deploy API + worker on a VPS.
