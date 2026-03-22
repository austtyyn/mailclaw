-- Row Level Security Policies for MailForge
-- Helper function: check if user belongs to a workspace
create or replace function public.user_belongs_to_workspace(workspace_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = workspace_uuid
    and user_id = auth.uid()
  );
$$;

-- Helper: check if user is workspace owner
create or replace function public.user_is_workspace_owner(workspace_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = workspace_uuid
    and user_id = auth.uid()
    and role = 'owner'
  );
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.domains enable row level security;
alter table public.mailboxes enable row level security;
alter table public.warmup_schedules enable row level security;
alter table public.messages enable row level security;
alter table public.deliverability_events enable row level security;
alter table public.agent_api_keys enable row level security;

-- profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- workspaces: members can view, owners can update/delete
create policy "Members can view workspaces"
  on public.workspaces for select
  using (public.user_belongs_to_workspace(id));

create policy "Users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() = owner_user_id);

create policy "Owners can update workspaces"
  on public.workspaces for update
  using (public.user_is_workspace_owner(id));

create policy "Owners can delete workspaces"
  on public.workspaces for delete
  using (public.user_is_workspace_owner(id));

-- workspace_members: members can view, owners can manage
create policy "Members can view workspace members"
  on public.workspace_members for select
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Owners can insert workspace members"
  on public.workspace_members for insert
  with check (public.user_is_workspace_owner(workspace_id));

create policy "Owners can update workspace members"
  on public.workspace_members for update
  using (public.user_is_workspace_owner(workspace_id));

create policy "Owners can delete workspace members"
  on public.workspace_members for delete
  using (public.user_is_workspace_owner(workspace_id));

-- domains: workspace members can access
create policy "Members can view domains"
  on public.domains for select
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can insert domains"
  on public.domains for insert
  with check (public.user_belongs_to_workspace(workspace_id));

create policy "Members can update domains"
  on public.domains for update
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can delete domains"
  on public.domains for delete
  using (public.user_belongs_to_workspace(workspace_id));

-- mailboxes: workspace members can access
create policy "Members can view mailboxes"
  on public.mailboxes for select
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can insert mailboxes"
  on public.mailboxes for insert
  with check (public.user_belongs_to_workspace(workspace_id));

create policy "Members can update mailboxes"
  on public.mailboxes for update
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can delete mailboxes"
  on public.mailboxes for delete
  using (public.user_belongs_to_workspace(workspace_id));

-- warmup_schedules: via mailbox -> domain -> workspace
create policy "Members can view warmup schedules"
  on public.warmup_schedules for select
  using (
    exists (
      select 1 from public.mailboxes m
      where m.id = warmup_schedules.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

create policy "Members can insert warmup schedules"
  on public.warmup_schedules for insert
  with check (
    exists (
      select 1 from public.mailboxes m
      where m.id = warmup_schedules.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

create policy "Members can update warmup schedules"
  on public.warmup_schedules for update
  using (
    exists (
      select 1 from public.mailboxes m
      where m.id = warmup_schedules.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

create policy "Members can delete warmup schedules"
  on public.warmup_schedules for delete
  using (
    exists (
      select 1 from public.mailboxes m
      where m.id = warmup_schedules.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

-- messages: workspace members can access
create policy "Members can view messages"
  on public.messages for select
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can insert messages"
  on public.messages for insert
  with check (public.user_belongs_to_workspace(workspace_id));

create policy "Members can update messages"
  on public.messages for update
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Members can delete messages"
  on public.messages for delete
  using (public.user_belongs_to_workspace(workspace_id));

-- deliverability_events: via mailbox -> workspace
create policy "Members can view deliverability events"
  on public.deliverability_events for select
  using (
    exists (
      select 1 from public.mailboxes m
      where m.id = deliverability_events.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

create policy "Members can insert deliverability events"
  on public.deliverability_events for insert
  with check (
    exists (
      select 1 from public.mailboxes m
      where m.id = deliverability_events.mailbox_id
      and public.user_belongs_to_workspace(m.workspace_id)
    )
  );

-- agent_api_keys: workspace members can view, owners/admins can manage
create policy "Members can view API keys"
  on public.agent_api_keys for select
  using (public.user_belongs_to_workspace(workspace_id));

create policy "Owners and admins can insert API keys"
  on public.agent_api_keys for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_api_keys.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can delete API keys"
  on public.agent_api_keys for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_api_keys.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );
