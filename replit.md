# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS

## Project: Attendance System

A full-stack web application for tracking daily attendance.

### Features
- Register users with webcam photo capture
- Mark daily attendance (prevents duplicates for same day)
- View all registered users in a dropdown
- View all attendance records sorted by date
- Overview dashboard with stats

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── attendance-app/     # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts        # Users table (id, name, imagePath, registeredAt)
│           └── attendance.ts   # Attendance table (id, userId, userName, date, timestamp)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/healthz | Health check |
| POST | /api/register | Register a user (name + base64 image) |
| GET | /api/users | Get all registered users |
| POST | /api/attendance | Mark attendance for a user |
| GET | /api/attendance | Get all attendance records |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`:
- `health.ts` — GET /healthz
- `register.ts` — POST /register, GET /users
- `attendance.ts` — POST /attendance, GET /attendance

Saves uploaded images to `./uploads/` directory.
JSON body limit is 20mb to support base64 images.

### `artifacts/attendance-app` (`@workspace/attendance-app`)

React + Vite frontend served at `/`. Uses React Query hooks from `@workspace/api-client-react`.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `src/schema/users.ts` — Users table
- `src/schema/attendance.ts` — Attendance records table

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) with Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
