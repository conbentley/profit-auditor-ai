
create type crm_platform as enum ('salesforce', 'hubspot', 'zoho', 'dynamics365', 'pipedrive', 'gohighlevel');

create table crm_integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform crm_platform not null,
  credentials jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_sync_at timestamptz,
  last_sync_status text,
  metadata jsonb default '{}'::jsonb,
  is_active boolean default true
);

-- Add RLS policies
alter table crm_integrations enable row level security;

create policy "Users can view their own CRM integrations"
  on crm_integrations for select
  using (auth.uid() = user_id);

create policy "Users can create their own CRM integrations"
  on crm_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own CRM integrations"
  on crm_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own CRM integrations"
  on crm_integrations for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_timestamp
  before update on crm_integrations
  for each row
  execute function update_updated_at_timestamp();
