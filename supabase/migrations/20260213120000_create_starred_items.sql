-- Create starred_items table
create table public.starred_items (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('resource', 'ai_answer')),
  title text not null,
  content text,
  topic text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint starred_items_pkey primary key (id)
);

-- Associate table with the main profile usage if needed (optional)
comment on table public.starred_items is 'Stores user starred resources and AI answers';

-- Enable RLS
alter table public.starred_items enable row level security;

-- Policy: Users can view their own starred items
create policy "Users can view own starred items"
on public.starred_items
for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own starred items
create policy "Users can insert own starred items"
on public.starred_items
for insert
with check (auth.uid() = user_id);

-- Policy: Users can update their own starred items
create policy "Users can update own starred items"
on public.starred_items
for update
using (auth.uid() = user_id);

-- Policy: Users can delete their own starred items
create policy "Users can delete own starred items"
on public.starred_items
for delete
using (auth.uid() = user_id);
