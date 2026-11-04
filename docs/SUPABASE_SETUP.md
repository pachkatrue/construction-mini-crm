# Supabase setup

This repository's first database migration is in `supabase/migrations/202611040001_initial_schema.sql`.

## Create a project

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and the publishable/anon client key.
3. Copy `.env.example` to `.env.local` and fill in the two Vite variables.
4. Apply the migration from the Supabase SQL Editor, or install the Supabase CLI and run `supabase db push`.

Never put a `service_role` key in the browser, repository, or Netlify's public build variables.

## Add demo users

Disable public sign-ups in **Authentication → Settings**. Create accounts manually in **Authentication → Users**. New users receive the least-privilege `executor` role automatically.

To promote the intended manager account, run this SQL after creating that account (replace the email):

```sql
update public.profiles p
set role = 'manager'
from auth.users u
where p.id = u.id and u.email = 'manager@example.com';
```

Set full names if desired:

```sql
update public.profiles
set full_name = 'Анна Петрова'
where id = (select id from auth.users where email = 'manager@example.com');
```

## Security model

- Managers can read and manage all projects and tasks.
- Executors can read only tasks assigned to their own user and the project context for those tasks.
- Executors can update only their assigned task status. A database trigger rejects edits to task content/assignment and invalid status transitions.
- Allowed executor transitions: `new → in_progress → review` and `revision → in_progress`.
- Allowed manager decisions: `review → accepted` or `review → revision`. Returning a task requires a non-empty comment.
- Every status transition is recorded by a database trigger. Authenticated clients cannot insert, update, or delete history rows.
- Deleting a project cascades to its tasks and their history.

The SQL migration is the security boundary. Hiding buttons in the UI is only a usability measure and is not treated as authorization.

## Current limitation

The frontend in the current commit still uses local demo data. Supabase client wiring and login are the next implementation step. Until that is completed, this migration can be reviewed independently but the app does not yet use it.
