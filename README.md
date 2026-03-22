# MailForge

Deliverability and warmup infrastructure for AI agents and automated outbound systems. MailForge lets you connect custom domains and mailboxes, verify email authentication records (SPF, DKIM, DMARC), create warmup schedules, track sender health, and expose a secure API for external systems like OpenClaw to choose the healthiest mailbox for sending.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres, Auth, RLS, Edge Functions)

## Prerequisites

- Node.js 18+
- Supabase account or Supabase CLI for local development

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Local Supabase Setup

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Start: `supabase start`
3. Get credentials: `supabase status` → copy API URL and anon key
4. Apply migrations: `supabase db reset` (or `supabase db push` for remote)

## Running the App

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign up to create an account; your first workspace is created automatically.

## Seed Data

1. Sign up at `/sign-up` first.
2. Run: `npm run db:seed`

Creates: workspace, domain (example.com), two mailboxes, warmup schedules, messages, deliverability events, and a test API key. The raw API key is printed once—save it for testing the agent endpoints.

## Project Structure

```
MailClaw/
├── app/
│   ├── (app)/                 # Authenticated app (shared layout)
│   │   ├── dashboard/
│   │   ├── domains/
│   │   ├── mailboxes/
│   │   ├── warmup/
│   │   └── settings/api-keys/
│   ├── api/
│   │   ├── domains/
│   │   ├── mailboxes/
│   │   ├── warmup/generate
│   │   ├── agent/             # API key auth
│   │   └── settings/api-keys/
│   ├── auth/callback/
│   ├── sign-in/
│   └── sign-up/
├── lib/
│   ├── api/                   # responses, constants, with-auth
│   ├── supabase/
│   ├── auth/
│   ├── dns/
│   ├── health/
│   ├── api-keys/
│   ├── agent/
│   ├── warmup/
│   ├── validation.ts
│   └── utils.ts
├── components/
├── supabase/
│   ├── migrations/
│   └── functions/
└── scripts/seed.ts
```

## API Response Format

All API routes return JSON:

- **Success**: `{ ...data }` (status 200/201)
- **Error**: `{ error: string }` (status 4xx/5xx)

## Agent API

Create keys under **Settings → API Keys**. Authenticate with `Authorization: Bearer <key>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/auth/validate` | Validate API key |
| GET | `/api/agent/best-sender` | Get healthiest available mailbox |
| POST | `/api/agent/send-permission` | Check if mailbox can send |
| POST | `/api/agent/log-event` | Log deliverability events |
| GET | `/api/agent/domain-health` | Get domain health summary |

### Send-Permission Denial Reasons

`MAILBOX_NOT_FOUND` | `SENDING_DISABLED` | `HEALTH_BELOW_THRESHOLD` | `DOMAIN_NOT_VERIFIED` | `DOMAIN_HEALTH_LOW` | `DAILY_LIMIT_REACHED`

## Edge Functions

```bash
supabase functions deploy process-warmup
supabase functions deploy recalculate-health
```

Wire to cron for daily warmup processing and health recalculation.
