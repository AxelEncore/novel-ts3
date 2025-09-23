# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository layout
- Primary app: encore-tasks-main (Next.js 15, React 19, TypeScript, Tailwind)
- Database tooling: encore-tasks-main/database (PostgreSQL migrations and scripts)
- Backend (experimental/scaffold): encore-tasks-main/backend (Express/Prisma deps present; not wired to main app scripts)
- Root package.json is minimal and does not contain development scripts

Common commands (Windows PowerShell)
- Install dependencies
  ```powershell path=null start=null
  # App
  npm install --prefix .\encore-tasks-main

  # Database scripts (required for DB tooling commands below)
  npm install --prefix .\encore-tasks-main\database
  ```

- Develop / build / run
  ```powershell path=null start=null
  # Start Next.js dev server
  npm run dev --prefix .\encore-tasks-main

  # Build production bundle
  npm run build --prefix .\encore-tasks-main

  # Start production server
  npm run start --prefix .\encore-tasks-main
  ```

- Linting and formatting
  ```powershell path=null start=null
  # ESLint (Next.js lint)
  npm run lint --prefix .\encore-tasks-main

  # Prettier (writes in-place)
  npm run format --prefix .\encore-tasks-main
  ```

- Database operations (PostgreSQL)
  ```powershell path=null start=null
  # Run app-level migration wrapper (invokes database/migrate.js)
  npm run db:migrate --prefix .\encore-tasks-main

  # Roll back last migration
  npm run db:rollback --prefix .\encore-tasks-main

  # Advanced DB scripts (run inside the database package)
  npm run migrate:status   --prefix .\encore-tasks-main\database
  npm run migrate:create   --prefix .\encore-tasks-main\database
  npm run db:setup         --prefix .\encore-tasks-main\database
  npm run db:reset         --prefix .\encore-tasks-main\database
  npm run db:seed          --prefix .\encore-tasks-main\database
  ```

- Tests
  ```powershell path=null start=null
  # Database test suite (runs migration/function checks if present)
  npm run test --prefix .\encore-tasks-main\database

  # Run a specific database test group
  npm run test:migrations --prefix .\encore-tasks-main\database
  npm run test:functions  --prefix .\encore-tasks-main\database

  # Note: The Next.js app has Jest/ts-jest as dev dependencies but no app-level test script is defined.
  # If app tests are added, you can run them ad-hoc like:
  # npx jest .\encore-tasks-main\path\to\your.test.ts
  ```

Architecture overview
- Next.js App Router API
  - Location: encore-tasks-main/src/app/api
  - REST-style route handlers for projects, boards, columns, tasks, users, csrf, auth, and admin utilities
  - Authentication is handled via NextAuth route: src/app/api/auth/[...nextauth]/route.ts, with supporting login/logout/register endpoints
  - CSRF endpoints and helpers exist (src/lib/csrf.ts) used by state-changing operations

- UI and state management
  - Pages and layout under src/app
  - Major UI composed from src/components (Kanban board, modals, forms, notifications, UI primitives)
  - Global app state via React Context in src/contexts/AppContext.tsx with supporting hooks (src/hooks)
  - Drag-and-drop via @dnd-kit for Kanban interactions

- Data access and services
  - Database access is abstracted through an adapter pattern
    - src/lib/database-adapter.ts and src/lib/adapters/postgresql-adapter.ts provide a PostgreSQL implementation
  - Higher-level business logic via services located in src/services and a refactored domain-oriented split in src/refactored
    - refactored/data: repositories and adapter facades
    - refactored/business: services, validators, and interfaces
    - refactored/presentation: components, context, hooks, and utils

- Database and migrations
  - PostgreSQL schema and migrations: encore-tasks-main/database/migrations
  - Operational scripts: encore-tasks-main/database/scripts (create/drop/setup/reset/backup/restore/cleanup)
  - Requires a valid DATABASE_URL or discrete POSTGRES_* env vars; see database README for Windows setup details

Environment
- Minimum required variables (examples; set these in a local .env and do not commit secrets):
  ```bash path=null start=null
  # PostgreSQL
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432
  POSTGRES_DB=encore_tasks
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=...
  DATABASE_URL=postgresql://postgres:...@localhost:5432/encore_tasks
  ```
- See encore-tasks-main/database/README.md for Windows-specific PostgreSQL installation and initialization, and encore-tasks-main/WARP.md for the broader env list used by the app (JWT/SESSION, optional Telegram).

Project rules
- Task board statuses must follow these constraints:
  - Allowed statuses include: «К выполнению», «В работе», «На проверке», «Выполнено»
  - The «К выполнению» status must use a blue background
  - The «Беклог» status must not be present among the task statuses

Notes for future agents
- The repository contains both next.config.ts and next.config.js inside encore-tasks-main; prefer next.config.ts for edits and keep configuration in a single file to avoid divergence.
- Root-level package.json is not used for app workflows; run commands via the encore-tasks-main package (and its database subpackage).
- Some legacy and refactored code paths co-exist (src/services vs src/refactored); check usages before modifying shared types or interfaces.
