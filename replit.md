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
- **Face Recognition**: face-api.js (TinyFaceDetector + FaceLandmark68 + FaceRecognition)

## Project: Attendance System

A full-stack web application for tracking daily attendance using real-time face recognition.

### Features
- **Register** — webcam photo capture + face descriptor extraction (128 floats, stored as JSONB)
- **Face Check-In** — real-time camera loop, auto-marks check-in/check-out via face matching
- **Records** — attendance history grouped by date, with check_in/check_out type badges
- **Admin** — member registry showing face enrollment status per user
- **Overview** — dashboard with total members, present today, system status
- Duplicate prevention: 2 records max per user/day (check_in + check_out)
- Cooldown: 10s per person after face match to prevent double-scanning
- Match threshold: 0.5 Euclidean distance (strict)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── attendance-app/     # React + Vite frontend
│       ├── public/models/  # face-api.js model weights (.bin, manifest.json)
│       └── src/
│           ├── lib/faceApi.ts              # Face recognition utilities
│           └── components/sections/
│               ├── Home.tsx            # Overview dashboard
│               ├── Register.tsx        # Registration with live face detection
│               ├── CheckIn.tsx         # Real-time face recognition check-in
│               ├── AttendanceList.tsx  # Attendance records
│               └── Admin.tsx           # Member registry / admin panel
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts        # Users table (id, name, imagePath, faceDescriptor JSONB, registeredAt)
│           └── attendance.ts   # Attendance table (id, userId, userName, date, type, timestamp)
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
| POST | /api/register | Register a user (name + base64 image + faceDescriptor). If user exists + descriptor provided → updates descriptor |
| GET | /api/users | Get all users (with hasFaceDescriptor flag) |
| GET | /api/users/descriptors | Get all users with raw faceDescriptor arrays (for client-side matching) |
| POST | /api/attendance | Mark attendance (auto check_in or check_out, max 2/day) |
| GET | /api/attendance | Get all attendance records with type field |

## Face Recognition Flow

1. **Models**: TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet served from `/models/`
2. **Registration**: Camera opens → live face overlay (green box = 1 face, orange = 0 or 2+) → capture → validate 1 face → extract 128-float descriptor → POST to API
3. **Check-In**: `GET /api/users/descriptors` on mount → detection loop every 300ms → euclidean distance matching → auto-POST attendance on match + cooldown

## Re-registration

To update a member's face: go to Register tab, enter the same name, and capture a new face. The backend will update the existing descriptor (no 409 error when faceDescriptor is provided).

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
- `register.ts` — POST /register, GET /users, GET /users/descriptors
- `attendance.ts` — POST /attendance, GET /attendance

Saves uploaded images to `./uploads/` directory.
JSON body limit is 20mb to support base64 images.

### `artifacts/attendance-app` (`@workspace/attendance-app`)

React + Vite frontend served at `/`. Uses React Query hooks from `@workspace/api-client-react`.
Face recognition powered by `face-api.js`. Model files in `public/models/`.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `src/schema/users.ts` — Users table with `faceDescriptor` JSONB column
- `src/schema/attendance.ts` — Attendance records with `type` column (check_in/check_out)

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) with Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
