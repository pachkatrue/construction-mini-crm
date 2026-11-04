-- BuildFlow CRM: initial relational model and authorization policies.
-- Apply with: supabase db push (or paste into the Supabase SQL editor).

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('manager', 'executor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('new', 'in_progress', 'review', 'revision', 'accepted');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'executor',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text not null default '',
  description text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  assignee_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  status public.task_status not null default 'new',
  status_comment text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_status_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  old_status public.task_status not null,
  new_status public.task_status not null,
  comment text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists task_status_history_task_id_idx on public.task_status_history(task_id, changed_at desc);

-- New Auth users receive a least-privilege executor profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'executor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- SECURITY DEFINER avoids recursive profile RLS checks.
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'manager'::public.app_role, false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();

-- Enforce the state machine even if a client bypasses the UI/RPC.
create or replace function public.guard_task_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if not public.is_manager() then
      raise exception 'Only a manager can create tasks' using errcode = '42501';
    end if;
    new.created_by := v_actor;
    new.status := 'new';
    new.status_comment := null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Task identity and author fields are immutable' using errcode = '42501';
  end if;

  v_role := public.current_user_role();
  if v_role = 'manager' then
    if new.status is distinct from old.status
       and not (
         old.status = 'review'
         and new.status in ('accepted', 'revision')
       ) then
      raise exception 'Invalid manager status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
    if new.status = 'revision' and new.status is distinct from old.status
       and length(trim(coalesce(new.status_comment, ''))) = 0 then
      raise exception 'A comment is required when returning a task for revision'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if v_role = 'executor' then
    if old.assignee_id is distinct from v_actor then
      raise exception 'You can only update tasks assigned to you' using errcode = '42501';
    end if;
    if new.project_id is distinct from old.project_id
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.assignee_id is distinct from old.assignee_id
       or new.created_by is distinct from old.created_by
       or new.due_date is distinct from old.due_date
       or new.priority is distinct from old.priority then
      raise exception 'Executors may only change task status and its comment' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not (
         (old.status = 'new' and new.status = 'in_progress')
         or (old.status = 'in_progress' and new.status = 'review')
         or (old.status = 'revision' and new.status = 'in_progress')
       ) then
      raise exception 'Invalid executor status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
    if new.status_comment is distinct from old.status_comment
       and new.status is not distinct from old.status then
      raise exception 'A status comment can only be changed together with a status'
        using errcode = '23514';
    end if;
    return new;
  end if;

  raise exception 'User role is not configured' using errcode = '42501';
end;
$$;

drop trigger if exists tasks_guard_write on public.tasks;
create trigger tasks_guard_write
before insert or update on public.tasks
for each row execute function public.guard_task_write();

-- History is written only by this trigger; clients cannot forge or edit entries.
create or replace function public.write_task_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.task_status_history
      (task_id, old_status, new_status, comment, changed_by)
    values
      (new.id, old.status, new.status, nullif(trim(new.status_comment), ''), auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_write_status_history on public.tasks;
create trigger tasks_write_status_history
after update of status on public.tasks
for each row execute function public.write_task_status_history();

-- A narrow RPC gives the frontend one explicit status-change operation.
create or replace function public.change_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  update public.tasks
     set status = p_new_status,
         status_comment = nullif(trim(coalesce(p_comment, '')), '')
   where id = p_task_id
   returning * into v_task;

  if not found then
    raise exception 'Task not found or access denied' using errcode = 'P0002';
  end if;
  return v_task;
end;
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

drop policy if exists "Profiles: read own or manager" on public.profiles;
create policy "Profiles: read own or manager"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_manager());

drop policy if exists "Managers: manage projects" on public.projects;
create policy "Managers: manage projects"
on public.projects for all to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Executors: read assigned project context" on public.projects;
create policy "Executors: read assigned project context"
on public.projects for select to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.project_id = projects.id and t.assignee_id = auth.uid()
  )
);

drop policy if exists "Managers: manage tasks" on public.tasks;
create policy "Managers: manage tasks"
on public.tasks for all to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "Executors: read own tasks" on public.tasks;
create policy "Executors: read own tasks"
on public.tasks for select to authenticated
using (assignee_id = auth.uid());

drop policy if exists "Executors: update own task status" on public.tasks;
create policy "Executors: update own task status"
on public.tasks for update to authenticated
using (assignee_id = auth.uid() and public.current_user_role() = 'executor'::public.app_role)
with check (assignee_id = auth.uid() and public.current_user_role() = 'executor'::public.app_role);

drop policy if exists "Read history for visible tasks" on public.task_status_history;
create policy "Read history for visible tasks"
on public.task_status_history for select to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_status_history.task_id
      and (public.is_manager() or t.assignee_id = auth.uid())
  )
);

-- No direct writes to profiles/history from an authenticated client.
revoke insert, update, delete, truncate on public.task_status_history from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles, public.projects, public.tasks, public.task_status_history to authenticated;
grant insert, update, delete on public.projects, public.tasks to authenticated;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_manager() to authenticated;
