-- Harden callable functions and simplify RLS evaluation.
-- Trigger functions are not intended to be callable through PostgREST RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_task_write() from public, anon, authenticated;
revoke all on function public.write_task_status_history() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_manager() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_manager() to authenticated;

-- Cover the remaining foreign keys used for joins and deletes.
create index if not exists projects_created_by_idx on public.projects(created_by);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists task_status_history_changed_by_idx on public.task_status_history(changed_by);

-- Replace overlapping permissive policies with one policy per operation.
drop policy if exists "Managers: manage projects" on public.projects;
drop policy if exists "Executors: read assigned project context" on public.projects;
create policy "Read projects in permitted scope"
on public.projects for select to authenticated
using (
  (select public.is_manager())
  or exists (
    select 1 from public.tasks t
    where t.project_id = projects.id and t.assignee_id = (select auth.uid())
  )
);
create policy "Managers: insert projects"
on public.projects for insert to authenticated
with check ((select public.is_manager()));
create policy "Managers: update projects"
on public.projects for update to authenticated
using ((select public.is_manager()))
with check ((select public.is_manager()));
create policy "Managers: delete projects"
on public.projects for delete to authenticated
using ((select public.is_manager()));

drop policy if exists "Managers: manage tasks" on public.tasks;
drop policy if exists "Executors: read own tasks" on public.tasks;
drop policy if exists "Executors: update own task status" on public.tasks;
create policy "Read tasks in permitted scope"
on public.tasks for select to authenticated
using (
  (select public.is_manager())
  or assignee_id = (select auth.uid())
);
create policy "Managers: insert tasks"
on public.tasks for insert to authenticated
with check ((select public.is_manager()));
create policy "Update tasks in permitted scope"
on public.tasks for update to authenticated
using (
  (select public.is_manager())
  or (assignee_id = (select auth.uid()) and (select public.current_user_role()) = 'executor'::public.app_role)
)
with check (
  (select public.is_manager())
  or (assignee_id = (select auth.uid()) and (select public.current_user_role()) = 'executor'::public.app_role)
);
create policy "Managers: delete tasks"
on public.tasks for delete to authenticated
using ((select public.is_manager()));

drop policy if exists "Profiles: read own or manager" on public.profiles;
create policy "Profiles: read own or manager"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_manager()));

drop policy if exists "Read history for visible tasks" on public.task_status_history;
create policy "Read history for visible tasks"
on public.task_status_history for select to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_status_history.task_id
      and ((select public.is_manager()) or t.assignee_id = (select auth.uid()))
  )
);
