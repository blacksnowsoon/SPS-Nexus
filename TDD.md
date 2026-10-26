# SPS Nexus UAT Project — Technical Design Document

## 1. Purpose

This document defines a simple, collaborative UAT project-management application built from the existing SPS Nexus test scenarios. Authenticated users work in one shared project and an active round/sprint, execute the same shared scenario set, and maintain their own execution results. Scenarios are editable while open. A tester can flag an open scenario as having an issue; authorized administrators then manage the issue through In Progress and Closed.

The implementation should use Vite, React, TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, and Row Level Security). This document is also a copy-ready implementation prompt in Section 11.

## 2. Scope and source data

- The source scenario inventory is `uat-test-cases.json`, containing 266 scenarios across 8 modules and 27 sections.
- Preserve each scenario's source order and original Arabic wording. Its fields are `id`, `module`, `section`, `category`, `num`, `title`, `desc`, `steps`, and `expected`.
- In the JSON, `steps` and `expected` are arrays of strings. Preserve them as arrays in application and database representations; do not concatenate them into a single paragraph.
- The authenticated application has one shared SPS Nexus project. Administrators can create rounds/sprints within that project. Each round has a scenario set drawn from the shared inventory (all scenarios by default, with the ability to select a subset).
- All active users in a round see the same scenario content and shared issue lifecycle. Every user's execution status and notes are separate, associated with that user, scenario, and round.
- This is a simple UAT/project workflow, not a general-purpose project-management suite. No chat, time tracking, billing, arbitrary task board, or external issue tracker is required.

## 3. Technology and environment

- **Build:** Vite
- **Application:** React + TypeScript
- **Styling:** Tailwind CSS, RTL-aware/logical layout utilities
- **Backend:** Supabase Postgres, Supabase Auth, and Row Level Security (RLS)
- **Client SDK:** `@supabase/supabase-js`
- **Authentication:** Supabase Google OAuth provider
- **Tests:** Vitest, React Testing Library, user-event; test database policies/migrations with Supabase CLI if available
- **Issue exports:** admins can select issue reports and export an XLSX workbook or a print-ready PDF from authorized, current Supabase data. PDF export uses the browser's print-to-PDF flow. DOCX and other reports remain optional future work.

Use a package lockfile and compatible pinned dependency versions. Configure Vite with public Supabase URL and anon/publishable key variables. Never put the Supabase service-role key or Google OAuth client secret in browser code, `.env` files committed to source control, or client-visible build variables.

## 4. Authentication, profiles, and activation

### 4.1 Google sign-in

- Users sign in using Supabase Auth's Google provider; do not implement a separate Google token exchange or custom password authentication.
- Configure Google OAuth credentials in the Google Cloud console and Supabase dashboard. Register local development and production redirect URLs in both providers.
- Provide a clear sign-in, signed-in, and sign-out experience. Restore and refresh the Supabase session using the SDK's supported session handling.
- Handle OAuth cancellation, callback errors, expired sessions, and network failures with visible feedback.

### 4.2 Profile provisioning and manual activation

- On successful first authentication, create one profile for the Supabase Auth user. Prefer a Postgres trigger on `auth.users` that inserts a profile with `status = 'pending'` and a non-privileged default role. Use an upsert-safe trigger so retries do not create duplicates.
- Profiles include at minimum the Auth user ID, display name, email, avatar URL where available, role, activation status, and timestamps.
- Newly created profiles are **disabled/pending**. They must not read or modify project, round, scenario, or execution data until manually activated.
- An authorized operator activates a user by changing the profile status directly in the Supabase database/dashboard. Do not provide a self-service activation action in the app.
- The application shows a pending-approval screen to authenticated users whose profile exists but is not active. A missing profile is an explicit provisioning error with safe retry/sign-out guidance, not an implicit active account.
- User-controlled OAuth metadata is informational only. Never derive activation or admin privileges from an email address, display name, provider metadata, or client-side state.
- Role and activation changes must be enforced by RLS as well as by the UI. No client may update its own role or activation status.

### 4.3 Roles

- `tester`: an activated user who can view the shared project/round/scenarios and manage only their own execution results. A tester can submit an issue report against an open scenario.
- `admin`: an activated user manually granted admin role in the database. Admins can manage project rounds/scenario membership, edit shared scenarios while open, and advance issue lifecycle state.
- Keep the initial role assignment and all privilege grants server/database controlled. Do not add a client-facing role editor.

For a small deployment, one or more trusted operators may activate and promote users using SQL in the Supabase dashboard. If a separate in-app admin management feature is added later, it must use a trusted server-side boundary or carefully secured database function; never expose a service-role key to implement it.

## 5. Product behavior

### 5.1 Language and application shell

- Arabic is the primary language. Set document `lang="ar"` and `dir="rtl"`.
- Preserve mixed Arabic and English terms (UAT, Test Case, Open, In Progress) where appropriate. Apply local LTR direction to dates, IDs, and other values when legibility requires it.
- Use a responsive, accessible, compact project-management interface with project/round selection, navigation, scenario list/detail, status badges, and clear action affordances.
- Display loading, empty, unauthorized, pending-activation, and error states explicitly.

### 5.2 Shared project and rounds/sprints

- There is one shared project named SPS Nexus. Keep its identifying row in the database so it can have metadata and a persistent ID; do not implement multi-tenant project switching in the initial version.
- Admins create, rename, activate, and archive rounds/sprints. Only one round should be active at a time unless the product requirements change.
- A round has a name, optional description, status (`planned`, `active`, `completed`, or `archived`), creator, and timestamps.
- Admins select which shared scenarios are included in a round. Default a newly created round to all 266 scenarios, preserving source order; allow inclusion/exclusion before execution starts.
- Activated users can view the active round and its scenarios. Historical rounds are read-only to testers; admins may view their history.
- Prevent removal of a scenario from a round once it has execution records or an issue. If removal is essential, archive/exclude it without deleting its history.

### 5.3 Scenario browsing and editing

- Show scenarios grouped by module, section, and category. Support searching by title, description, steps, expected result, and relevant execution notes; filter by module, section, scenario lifecycle, and the signed-in user's execution status.
- A scenario detail view shows title, module/section/category, description, ordered steps, expected-result items, issue lifecycle, and the current user's round-specific execution/result.
- A round gets a snapshot of each selected scenario's title, description, steps array, expected array, module, section, category, and source sequence/ID when its scenario set is created.
- Admins may edit a round's shared scenario snapshot only while that round/scenario workflow is `open`. All active users in that round see the same content.
- Once the workflow leaves `open`, that round's scenario content is locked. Other rounds keep their own snapshot and history. New rounds start from the latest source-catalog content.
- Keep edits attributable with `updated_by` and timestamps. Consider a lightweight revision/audit table if practical; at minimum record who last edited and when.
- Preserve the 266 source scenarios as seeded shared scenario records. Do not allow a client to overwrite built-in scenario IDs during import or synchronization.

### 5.4 Per-user execution results

- Each activated user executes the same scenario set independently in each round. Store execution records keyed by round, scenario, and user; users do not overwrite one another's outcomes or notes.
- Execution status is `not_tested`, `passed`, `failed`, or `not_applicable`. A missing execution record is equivalent to `not_tested`.
- A tester can update their own status and notes while the scenario is `open`. Notes and status are not shared as editable user-owned fields.
- A tester may submit an issue report when a scenario fails. The report should include the user's observations/notes and reference the current scenario and round. Submitting a report transitions the shared scenario from `open` to `has_issues`; it must not silently overwrite other users' execution records.
- Once a scenario is `has_issues`, `in_progress`, or `closed`, execution is read-only for testers. Existing per-user execution results remain visible and preserved.
- Store creator/updater/timestamps for each execution. An execution should have a uniqueness constraint on `(round_id, scenario_id, user_id)`.
- Report progress both per user and overall for the round. Overall counts must count a scenario/user execution pair, not treat one user's result as the result for all users. Clearly label the denominator and number of participating users.

### 5.5 Shared issue lifecycle and edit lock

Use one lifecycle state per round/scenario, separate from each user's execution status:

```text
open ── tester reports an issue ──> has_issues
has_issues ── activated admin ──> in_progress
in_progress ── activated admin verifies/resolves ──> closed
```

- `open`: scenario is available for execution and its round-specific content snapshot is editable by admins.
- `has_issues`: a tester has raised an issue. This round's content snapshot is locked; issue details and affected executions remain available to the team.
- `in_progress`: an admin has taken ownership for investigation/fix. This round's scenario is closed to tester edits and further execution.
- `closed`: an admin has resolved the issue and closed the scenario for this round. It remains read-only and visible in history.
- Testers can flag an open scenario but cannot change it back to open, start development, or close it.
- Only an active admin may move `has_issues` to `in_progress` or `in_progress` to `closed`. Admin transitions must be validated and auditable. Disallow arbitrary state changes and invalid transitions in the database.
- The transition to `in_progress` makes the round's scenario closed to tester execution/edits, as requested; `closed` is a distinct final resolved state for reporting/history.
- Do not delete scenarios or issues to represent completion. Preserve lifecycle and execution history.

## 6. Supabase data model

Use UUID primary keys except where preserving a source scenario ID is beneficial. Add foreign keys, check constraints, useful indexes, and UTC timestamps. Names are illustrative; use consistent naming throughout the implementation.

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, references `auth.users(id)` | One profile per Auth account |
| `email` | `text` | Synced from Auth; not a privilege source |
| `display_name` | `text` | OAuth display name |
| `avatar_url` | `text`, nullable | Optional |
| `role` | enum/text | `tester` or `admin`; default `tester` |
| `status` | enum/text | `pending` or `active`; default `pending` |
| `created_at`, `updated_at` | `timestamptz` | UTC |

The profile creation trigger should copy only safe presentation metadata. Ensure profile updates from Auth do not reset an operator-assigned role or activation status.

### `projects`

One seeded row for SPS Nexus. Fields: `id`, `name`, `description`, `created_at`, `updated_at`.

### `rounds`

Fields: `id`, `project_id`, `name`, `description`, `status`, `created_by`, `created_at`, `updated_at`, `completed_at`. Add a database constraint or transaction-safe function to ensure at most one active round for this single project.

### `scenarios`

Seed the 266 built-in source-catalog cases. Fields: `id` (preserve source IDs such as `t1`), `module`, `section`, `category`, `source_number`, `title`, `description`, `steps` (`jsonb` array of strings), `expected` (`jsonb` array of strings), `is_builtin`, `created_at`, `updated_at`. This is the source template catalog; it does not contain a round's issue lifecycle.

### `round_scenarios`

Join table and round-specific content snapshot: `round_id`, `scenario_id`, `sort_order`, `module`, `section`, `category`, `source_number`, `title`, `description`, `steps` (`jsonb` string array), `expected` (`jsonb` string array), `added_by`, `added_at`, `updated_by`, `updated_at`, optional `removed_at`. Use `(round_id, scenario_id)` as a unique key. Initialize snapshot fields from `scenarios` when creating the round's scenario set. Admins may edit the snapshot only while its workflow is `open`. Preserve membership/history when removed; do not hard-delete records that have results or issues.

### `scenario_executions`

Fields: `id`, `round_id`, `scenario_id`, `user_id`, `status`, `notes`, `created_at`, `updated_at`. `status` allows `not_tested`, `passed`, `failed`, and `not_applicable`. Enforce unique `(round_id, scenario_id, user_id)` and ensure the scenario is in the referenced round.

### `scenario_issues`

Fields: `id`, `round_id`, `scenario_id`, `reported_by`, `report`, `created_at`, `updated_at`. Retain issue reporter and details independently from user execution notes. Use a unique/active-issue constraint or transaction-safe logic to prevent duplicate concurrent first reports from creating duplicate active issues for the same round/scenario. Keep lifecycle in `round_scenario_workflows`.

### `round_scenario_workflows`

Canonical issue state per round/scenario: `round_id`, `scenario_id`, `status` (`open`, `has_issues`, `in_progress`, `closed`), `assigned_to`, `issue_summary`, `created_at`, `updated_at`, `closed_at`, `updated_by`. Key by `(round_id, scenario_id)` and reference the matching `round_scenarios` row. Create workflow rows when adding scenarios to a round. Use this state for snapshot edit locks, tester execution locks, issue queues, and reports. A new round gets its own `open` workflow rows; no lifecycle state is stored on the source-catalog `scenarios` table.

### Database migrations and seed data

- Commit ordered Supabase SQL migrations for schema, constraints, indexes, profile trigger, helper functions, and RLS policies.
- Seed project and all original scenario records from `uat-test-cases.json` in a reproducible migration/seed workflow. Preserve IDs, arrays, Arabic text, module/section grouping, and order.
- Seed the project and scenario inventory idempotently. Do not reset or overwrite user execution data on subsequent seed runs.
- Include a documented SQL operation for an operator to activate an account and grant the admin role after verifying its Auth UUID/email.

Example operator-only SQL (run in the Supabase SQL editor after checking the target user):

```sql
update public.profiles
set status = 'active',
    role = 'admin',
    updated_at = now()
where id = '<verified-auth-user-uuid>';
```

For a tester, set `role = 'tester'`. Avoid granting admin by email in trigger logic.

## 7. Authorization and RLS requirements

RLS is mandatory on every public table. The UI is not a security boundary.

- Anonymous users have no access to project data.
- An authenticated pending profile may read only its own profile row and must not read project, rounds, scenarios, memberships, execution records, or issue data.
- Active users may read the single shared project, rounds, scenario inventory, round membership/workflow, and appropriate issue details.
- Active testers may insert/update only their own `scenario_executions`, and only while the relevant round is active and the round/scenario workflow is `open`.
- Testers may submit an issue only for a scenario in the active round. The workflow transition to `has_issues` and creation of the issue record must be atomic and race-safe.
- Testers cannot update round scenario snapshots, workflow status, other users' executions, profile role/status, round configuration, or membership.
- Active admins may manage rounds and membership, edit a round's scenario snapshot only while its workflow is open, assign issues, and perform only valid issue transitions.
- Closed/completed/archived rounds and non-open workflows are read-only to testers.
- Users can read their own profile. Admin visibility of profiles may be granted only where needed for user/assignee selection.
- Protect columns individually where necessary; a broad profile update policy must not let users change their role/status.
- Use database constraints and transaction-safe RPC/database functions for actions that span scenario executions, issue creation, and lifecycle transitions.
- Any `SECURITY DEFINER` function must set a safe `search_path`, be narrowly scoped, validate caller authorization inside the function, and revoke execution from `public`/`anon` as appropriate.
- Test RLS as anonymous, pending, active tester, and admin. Do not rely solely on frontend route guards.

Implement helper functions/policies carefully to avoid recursive profile-policy evaluation. Do not expose service-role credentials to the client. Use only the anon/publishable key in the Vite application.

## 8. Application structure and user experience

Suggested structure:

- `AuthProvider`: Supabase session state, Google sign-in, and sign-out.
- `AccessGate`: loading, signed-out, pending-activation, provisioning-error, and active-user states.
- `ProjectLayout`: shared project header, navigation, active round selector, account menu.
- `RoundOverview`: scenario counts, per-user progress, team progress, and issue summary.
- `ScenarioList`: search, filters, module/section grouping, lifecycle labels, and execution state.
- `ScenarioDetail`: ordered steps/expected arrays, editable fields when authorized, current-user execution, issue report, and issue history.
- `IssueQueue`: shared issues with reporter, affected round, assignment, lifecycle, and transition actions; admin actions only.
- `RoundManagement`: admin-only round lifecycle and scenario selection.
- `Profile`: display name/avatar and account status; no self-activation or role edit.
- `supabase/`: typed client, generated or maintained database types, and focused data-access modules.
- `supabase/migrations/` and `supabase/seed.sql`: schema, RLS, functions/triggers, and source scenario seed.

Use React Query or an equivalent cache only if needed for server data, and invalidate/update query results after mutations so users see current shared state. Handle concurrent edits using `updated_at` optimistic concurrency or a clear conflict message; do not silently clobber another user's changes. Realtime subscriptions are optional; if used, subscribe only to authorized project/round rows and test reconnection and duplicate-event behavior.

## 9. Validation, errors, and operational requirements

- Validate user inputs on the client for usability and again in database constraints/functions for integrity.
- Show explicit errors for OAuth failure, pending access, database failures, conflicts, permission denial, and failed saves.
- Do not optimistically claim a shared mutation succeeded until Supabase confirms it. If optimistic UI is used, roll it back on error.
- Keep scenario source text and user-supplied content rendered as escaped React text; never use `dangerouslySetInnerHTML`.
- Maintain a `.env.example` with placeholder Supabase URL and anon key only. Keep real credentials out of source control.
- Document Supabase dashboard setup: Google provider credentials, site/redirect URLs, migrations, seed, and operator activation procedure.
- Do not send user data to third-party analytics or unrelated services.
- Enforce the single active round constraint in the database, not only in the UI.
- Retain issue and execution history; avoid destructive reset/delete behavior in the production interface.

## 10. Testing and acceptance criteria

### Unit and component tests

1. Source dataset validation confirms 266 scenarios, 8 modules, 27 sections, unique IDs, required fields, and `steps`/`expected` arrays of strings.
2. Google sign-in starts correctly; callback, cancellation, sign-out, and expired session states display correctly.
3. New Auth users receive a pending profile; the application blocks project data until activation.
4. Profile role/status cannot be changed through client-facing profile forms or user-scoped database policies.
5. A tester sees the shared project and active round, but cannot access admin controls.
6. Per-user results and notes remain separate for two users executing the same scenario and round.
7. Updating one user's result recalculates that user's progress and the clearly labeled team execution-pair totals.
8. Search, grouping, module/section/lifecycle filters, and ordered steps/expected rendering work.
9. Only admins can edit shared scenario content, and edits are rejected after the workflow leaves `open`.
10. Issue reporting transitions `open` to `has_issues` atomically and preserves the reporting user's execution.
11. Only an admin can transition `has_issues` to `in_progress` and `in_progress` to `closed`; invalid transitions are rejected.
12. Tester execution is rejected while a workflow is `has_issues`, `in_progress`, or `closed`, and in a non-active round.
13. Round membership, scenario workflow initialization, one-active-round rule, and historical records behave correctly.
14. RLS tests cover anonymous, pending, tester, and admin roles for reads and writes on every table.
15. Concurrent changes return a clear conflict/error rather than silently overwriting another user's work.

### Integration and manual acceptance

- Run migrations and seed into a clean local Supabase instance; verify all 266 scenarios are present with exact IDs, Arabic content, ordering, and array values.
- Verify migrations/seed can be reapplied safely without erasing execution or issue data.
- Test the Google OAuth flow with configured local callback URLs and a real configured provider in a non-production environment.
- Sign in as a pending account, confirm project data is inaccessible, activate the profile in the database, then sign in again and confirm access.
- Test two active testers and one admin in separate browser sessions. Confirm shared scenario/issue changes are shared while execution results remain per-user.
- Verify the full lifecycle `open → has_issues → in_progress → closed`, edit lock at issue reporting, tester read-only behavior, and admin-only transitions.
- Run `npm run build` and the focused unit/integration suites. Add an authorized browser smoke test if available.
- If exports are implemented, test real authorized data, report accuracy, Arabic rendering, scope, and error handling.

## 11. Copy-ready implementation prompt

> Build a production-ready, single-project SPS Nexus UAT project-management application using Vite, React, TypeScript, Tailwind CSS, and Supabase Postgres/Auth/RLS. Use the existing `uat-test-cases.json` as the authoritative scenario inventory. It contains 266 scenarios; preserve all Arabic text, IDs, module/section/category ordering, and the `steps` and `expected` arrays exactly. Add ordered array columns in the database and seed them reproducibly without overwriting user data.
>
> Implement Google sign-in through Supabase Auth. Create a profile for each Auth user with a database trigger; new profiles must default to `pending` and non-admin. Pending users see only an approval screen and cannot read project data. A trusted operator manually activates users and optionally grants the admin role in the Supabase database. Enforce activation and roles with RLS; never trust frontend role flags or OAuth metadata and never expose the service-role key.
>
> The first release has one shared SPS Nexus project and admin-managed rounds/sprints. Admins create rounds, choose their scenario set (all source scenarios by default), and activate at most one round. Every active user executes the same included scenarios independently. Store execution status and notes per `(round, scenario, user)`; do not overwrite or merge different users' results. Show per-user and clearly labeled team progress.
>
> When a round is created, copy selected source scenarios into round-specific content snapshots. Admins may edit the snapshot only while its round/scenario workflow is Open; all users in that round see the same snapshot. A new round starts with a fresh snapshot from the current source catalog. Each user can submit their own execution and report an issue on an Open scenario. Issue reporting atomically changes the round-specific workflow from `open` to `has_issues`; it locks that round's scenario snapshot and tester execution while preserving all user results. Only an activated admin can transition `has_issues` to `in_progress` and then `closed`. In Progress is already closed to tester changes; Closed is the final resolved/history state. Validate every transition in database logic and audit actor/timestamps.
>
> Create Supabase migrations for profiles, one project, rounds, the immutable source scenario catalog, round-specific scenario content snapshots, per-user executions, round-specific scenario workflow, issue details, constraints, indexes, profile provisioning, safe helper functions, and RLS for anonymous, pending, tester, and admin roles. Store issue lifecycle per round/scenario, not globally on the reusable source scenario. Add a documented operator SQL procedure for manual activation. Ensure policies prevent testers changing other users' results, profile roles, scenario workflow, round configuration, or locked content.
>
> Build an accessible Arabic RTL responsive UI with Google sign-in, activation-pending state, project/round overview, grouped/searchable scenario list, scenario details with ordered steps/expected items, per-user execution form, issue queue, admin-only round/scenario/issue controls, loading/error/conflict states, and sign-out. Keep exports optional and secondary to the shared workflow. Do not add unrelated general project-management features, chat, time tracking, or a backend outside Supabase.
>
> Add tests for dataset integrity, OAuth/access states, per-user result isolation, progress calculations, edit locks, issue transitions, round membership, and RLS for anonymous/pending/tester/admin identities. Run migrations and seed locally, verify reseeding preserves user data, run tests and production build, and report any provider setup that must be completed manually.
