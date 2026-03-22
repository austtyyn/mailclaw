-- MailForge Initial Schema
-- Apply: supabase db reset (local) | supabase db push (remote)

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- Core tables
-- =============================================================================

-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- workspaces: top-level tenant
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- workspace_members: many-to-many user-workspace
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- domains: verified sending domains
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'paused')),
  spf_status text not null default 'unknown' check (spf_status in ('pass', 'fail', 'unknown')),
  dkim_status text not null default 'unknown' check (dkim_status in ('pass', 'fail', 'unknown')),
  dmarc_status text not null default 'unknown' check (dmarc_status in ('pass', 'fail', 'unknown')),
  dns_last_checked_at timestamptz,
  health_score int not null default 100 check (health_score >= 0 and health_score <= 100),
  created_at timestamptz not null default now(),
  unique(domain)
);

create index domains_workspace_id_idx on public.domains(workspace_id);

-- mailboxes: email addresses bound to domains
create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  email text not null,
  provider text not null,
  provider_account_ref text,
  warmup_status text not null default 'pending' check (warmup_status in ('pending', 'warming', 'active', 'paused')),
  daily_limit int not null default 20 check (daily_limit >= 0),
  health_score int not null default 100 check (health_score >= 0 and health_score <= 100),
  sending_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(email)
);

create index mailboxes_workspace_id_idx on public.mailboxes(workspace_id);
create index mailboxes_domain_id_idx on public.mailboxes(domain_id);

-- warmup_schedules: daily send targets per mailbox
create table public.warmup_schedules (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  schedule_date date not null,
  target_send_count int not null default 0 check (target_send_count >= 0),
  actual_send_count int not null default 0 check (actual_send_count >= 0),
  stage text not null default 'new' check (stage in ('new', 'week1', 'week2', 'steady')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  unique(mailbox_id, schedule_date)
);

create index warmup_schedules_mailbox_id_idx on public.warmup_schedules(mailbox_id);

-- messages: outbound/inbound tracking
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  external_message_id text,
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound')),
  subject text,
  body_preview text,
  sent_at timestamptz,
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'delivered', 'soft_bounce', 'hard_bounce', 'complained')),
  bounce_type text,
  reply_status text not null default 'none' check (reply_status in ('none', 'replied', 'opened')),
  created_at timestamptz not null default now()
);

create index messages_workspace_id_idx on public.messages(workspace_id);
create index messages_mailbox_id_idx on public.messages(mailbox_id);

-- deliverability_events: sent, delivered, bounce, reply
create table public.deliverability_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index deliverability_events_mailbox_id_idx on public.deliverability_events(mailbox_id);
create index deliverability_events_created_at_idx on public.deliverability_events(created_at desc);

-- agent_api_keys: API auth for external systems
create table public.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  hashed_key text not null,
  created_at timestamptz not null default now()
);

create index agent_api_keys_workspace_id_idx on public.agent_api_keys(workspace_id);
