# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Encore Tasks** is a full-stack task management application built with Next.js 15, React 19, and TypeScript. It features a Kanban-style board interface for project and task management with real-time collaboration capabilities.

**Key Technologies:**
- **Frontend**: Next.js 15 App Router, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, PostgreSQL
- **Database**: PostgreSQL with custom adapter pattern
- **UI**: Radix UI components with custom styling
- **Drag & Drop**: @dnd-kit/core for Kanban functionality
- **Authentication**: Custom JWT-based auth with httpOnly cookies

## Development Commands

### Essential Commands
```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
prettier --write .
```

### Database Commands
```powershell
# Run database migrations
npm run db:migrate

# Rollback migrations
npm run db:rollback

# Test PostgreSQL connection
node test-postgresql-connection.js

# Initialize database schema
node database/migrate.js

# Check database schema
node check-schema.js
```

### Testing & Debugging Commands
```powershell
# Run API tests
node detailed-api-test.js

# Check users table
node check-users.js

# Debug project creation
node debug-project-creation.js

# Check database tables structure
node check-tables.js
```

## Architecture Overview

### Database Architecture
The application uses a **Database Adapter Pattern** with PostgreSQL as the primary database:

- **Database Adapter** (`src/lib/database-adapter.ts`) - Singleton wrapper providing a unified interface
- **PostgreSQL Adapter** (`src/lib/adapters/postgresql-adapter.ts`) - PostgreSQL-specific implementation
- **Migration System** (`database/`) - SQL migrations for schema management

### Frontend Architecture

**Context-Based State Management:**
- `src/contexts/AppContext.tsx` - Central application state using React Context + useReducer
- Global state includes: users, projects, boards, tasks, authentication, settings
- API integration with optimistic updates for better UX

**Component Structure:**
- `src/components/` - Main UI components (modals, forms, Kanban boards)
- `src/components/pages/` - Page-level components
- `src/components/ui/` - Reusable UI components (buttons, inputs, etc.)
- `src/components/notifications/` - Notification system

**Service Layer:**
- `src/services/` - Business logic services for different entities
- `src/services/implementations/` - Concrete service implementations
- Repository pattern with validators for data integrity

### API Architecture

**REST API Structure:**
- `src/app/api/` - Next.js 15 App Router API routes
- Authentication middleware with JWT tokens
- CSRF protection for state-changing operations
- Centralized error handling and validation

**Key API Endpoints:**
- `/api/projects` - Project CRUD operations
- `/api/boards` - Board management
- `/api/tasks` - Task operations with status updates
- `/api/users` - User management and authentication
- `/api/columns` - Kanban column management

### Type System
- `src/types/index.ts` - Main type definitions
- `src/types/core.types.ts` - Core business types
- `src/types/board.types.ts` - Board-specific types
- Strong TypeScript integration throughout

## Data Models

### Core Entities
```typescript
Project -> Boards -> Columns -> Tasks
Users <-> Projects (many-to-many via project members)
Users <-> Tasks (assignees, reporters)
```

### Database Schema
- **users**: Authentication and profile data
- **projects**: Project containers with settings
- **boards**: Kanban boards within projects  
- **columns**: Board columns with status mapping
- **tasks**: Individual work items with full metadata
- **project_members**: User-project associations
- **sessions**: Authentication session management

### Key Features
- **Drag & Drop**: Full Kanban board functionality with @dnd-kit
- **Real-time UI**: Optimistic updates with rollback on failure
- **Multi-user**: Project sharing with role-based permissions
- **Telegram Integration**: Notification support (configured via env vars)
- **Responsive Design**: Mobile-friendly interface with dark/light themes

## Development Guidelines

### Database Operations
- Always use the DatabaseAdapter singleton: `dbAdapter.getInstance()`
- Database connection is lazy-loaded and auto-initialized
- Use parameterized queries for security (adapter handles this)
- Check connection status with `dbAdapter.isConnected()`

### API Development
- All API routes require authentication (check with `verifyAuth()`)
- Use Zod schemas for request validation
- Return consistent response format: `{success: boolean, data?: any, error?: string}`
- CSRF tokens required for POST/PUT/DELETE operations

### Frontend State Management
- Use `useApp()` hook to access global state
- API operations are wrapped in context methods (createProject, updateTask, etc.)
- State updates trigger re-renders automatically via React Context
- Loading states are managed centrally in AppContext

### Component Development
- Use TypeScript interfaces from `src/types/`
- Follow existing component patterns for modals and forms
- Implement loading and error states consistently
- Use Tailwind classes for styling (check `tailwind.config.js`)

### Authentication Flow
- Login sets httpOnly cookie with JWT token
- Client-side auth state managed in AppContext
- API requests include Authorization header automatically
- Session validation on server-side with middleware

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/encore_tasks
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=encore_tasks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Auth
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Optional: Telegram Integration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### Database Setup
1. Install PostgreSQL locally or use Docker
2. Copy `.env.postgresql` to `.env` 
3. Run `npm run db:migrate` to set up schema
4. Test connection with `node test-postgresql-connection.js`

## Common Development Patterns

### Creating New Components
- Follow the existing modal pattern for user interactions
- Use the `useApp()` context for state operations
- Implement proper TypeScript props interfaces
- Handle loading/error states consistently

### Adding New API Endpoints
- Create route in `src/app/api/[entity]/route.ts`
- Add authentication check with `verifyAuth()`
- Use Zod for request validation
- Update API client in `src/lib/api.ts`

### Database Schema Changes
- Create new migration file in `database/migrations/`
- Update TypeScript interfaces in `src/types/`
- Test migration with rollback functionality
- Update database adapter if needed

### Testing Database Operations
The project includes numerous utility scripts for testing and debugging database operations. Use these patterns when developing new features or debugging issues.

## Migration Notes

This project has been migrated from SQLite to PostgreSQL. The PostgreSQL adapter provides the same interface as the previous SQLite implementation, ensuring compatibility while gaining PostgreSQL's advanced features and better concurrent access handling.