# Encore Tasks - Task Management Application

## Overview

Encore Tasks is a comprehensive task management application (Trello-like) built with Next.js and TypeScript.

- Modern Next.js application with TypeScript
- Role-based access control (Admin/User)
- Dark theme with glassmorphism design
- Kanban boards with drag-and-drop functionality
- Project and board management
- SQLite database with complete schema

## Project Status

✅ SUCCESSFULLY CONFIGURED AND RUNNING

The application is configured for local development. The database uses a local SQLite file and initializes automatically on first run.

## Database

- Engine: SQLite (better-sqlite3)
- Schema: database/sqlite_schema.sql
- Adapter: src/lib/adapters/sqlite-adapter.ts (via src/lib/database-adapter.ts)
- Connection: no server required; the DB file is created in ./database/encore_tasks.db

Environment (.env):

```env
DATABASE_TYPE=sqlite
DB_PATH=./database/encore_tasks.db
DATABASE_URL=sqlite:./database/encore_tasks.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<your-secret>
SESSION_SECRET=<your-session-secret>
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access the app at http://localhost:3000

## API and Auth

- Custom JWT-based authentication with httpOnly cookies
- Unified database adapter (dbAdapter) provides CRUD operations for users, projects, boards, columns, tasks

## Notes

- No PostgreSQL services, URLs, or SSL settings are required.
- All previous PostgreSQL references were removed or deprecated in favor of SQLite.
- Data persists locally in the SQLite file.
