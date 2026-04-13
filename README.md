# 🟢 MzansiBuilds

> Build in public. Inspire the community.

MzansiBuilds is a platform that helps developers build publicly and keep up with what other developers are building. Developers can share projects, post milestones, collaborate, comment on each other's work, and get celebrated when they ship.

[![CI](https://github.com/YOUR_USERNAME/mzansibuilds/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/mzansibuilds/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running tests](#running-tests)
- [API reference](#api-reference)
- [UML diagrams](#uml-diagrams)
- [AI usage](#ai-usage)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

MzansiBuilds supports the following user journeys:

1. **Account management** — developers register, log in, and manage their profile.
2. **Project creation** — create a project with a title, description, tech stack, current stage, and support required.
3. **Live feed** — browse a real-time feed of what the community is building, with live updates via Server-Sent Events.
4. **Collaboration** — comment on any project or raise a hand to request collaboration.
5. **Milestones** — continuously log progress milestones against a project.
6. **Celebration Wall** — completing a project adds the developer to a shared Celebration Wall.

---

## Architecture

```
mzansibuilds/
├── client/                   # React + TypeScript (Vite) — frontend SPA
│   ├── src/
│   │   ├── __tests__/        # Component, page, context, and service tests
│   │   ├── components/       # Navbar, ProjectCard, Footer
│   │   ├── context/          # AuthContext (JWT state)
│   │   ├── pages/            # Feed, Landing, Login, Register, NewProject, CelebrationWall
│   │   ├── services/         # Axios API client + SSE stream helper
│   │   └── types/
│   └── ...
├── server/                   # Node.js + Express + TypeScript — REST API
│   ├── src/
│   │   ├── __tests__/        # Route integration tests
│   │   ├── data/
│   │   │   └── store.ts      # JSON file-based data store (data.json)
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── projects.ts
│   │   ├── lib/
│   │   │   └── sseBroker.ts  # SSE connection manager
│   │   ├── app.ts
│   │   └── index.ts
│   └── ...
├── docs/
│   └── uml/                  # Use-case, class and sequence diagrams
└── .github/
    └── workflows/
        └── ci.yml
```

**Key architectural decisions:**

- REST API for CRUD operations; Server-Sent Events (SSE) for real-time project updates (new comments, collaboration requests).
- JWT-based authentication with short-lived access tokens.
- JSON file persistence via `data.json` (managed by `server/src/data/store.ts`) — no external database required to run locally.
- All secrets injected via environment variables — never hardcoded.

---

## Tech stack

| Layer      | Technology                                                           |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, TailwindCSS                              |
| Backend    | Node.js, Express, TypeScript                                         |
| Real-time  | Server-Sent Events (SSE)                                             |
| Data store | JSON file (`data.json`) via a custom store module                    |
| Auth       | JWT (jsonwebtoken) + bcryptjs                                        |
| Validation | Zod                                                                  |
| Security   | Helmet, express-rate-limit                                           |
| Testing    | Jest, Supertest (backend) · Vitest, React Testing Library (frontend) |
| CI/CD      | GitHub Actions                                                       |

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mzansibuilds.git
cd mzansibuilds

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### Environment setup

```bash
cd server
cp .env.example .env   # fill in your values
```

### Run in development

```bash
# Terminal 1 — backend (hot reload)
cd server && npm run dev

# Terminal 2 — frontend (hot reload)
cd client && npm run dev
```

The API runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

> **Note:** A `data.json` file will be created automatically in the project root the first time the server starts. This file acts as the local database — do not commit it.

---

## Environment variables

Copy `.env.example` to `.env` inside the `server/` directory and fill in the values. **Never commit `.env`.**

| Variable         | Description                          | Example                 |
| ---------------- | ------------------------------------ | ----------------------- |
| `PORT`           | Port the API server listens on       | `5000`                  |
| `JWT_SECRET`     | Secret key for signing access tokens | _(long random string)_  |
| `JWT_EXPIRES_IN` | Access token lifetime                | `15m`                   |
| `CLIENT_ORIGIN`  | Allowed CORS origin                  | `http://localhost:5173` |
| `NODE_ENV`       | Runtime environment                  | `development`           |

The frontend reads one variable (set in `client/.env`):

| Variable       | Description                  | Example                     |
| -------------- | ---------------------------- | --------------------------- |
| `VITE_API_URL` | Base URL for the backend API | `http://localhost:5000/api` |

---

## Running tests

### Backend

```bash
cd server
npm test                  # run all tests
npm run test:coverage     # with coverage report
```

### Frontend

```bash
cd client
npm test                  # run all component tests
npm run test:coverage
```

Tests follow a strict **Red → Green → Refactor** TDD cycle. Every route and core component has a corresponding test file. Rate limiting is automatically disabled in the test environment (`NODE_ENV=test`), so auth route tests will never produce false `429` responses. CI enforces that no code merges to `main` unless all tests pass.

---

## API reference

### Health check

| Method | Endpoint      | Description                |
| ------ | ------------- | -------------------------- |
| GET    | `/api/health` | Confirm the API is running |

### Auth

| Method | Endpoint             | Auth | Description                           |
| ------ | -------------------- | ---- | ------------------------------------- |
| POST   | `/api/auth/register` | —    | Register a new developer account      |
| POST   | `/api/auth/login`    | —    | Log in and receive a JWT access token |

### Projects

| Method | Endpoint                     | Auth          | Description                             |
| ------ | ---------------------------- | ------------- | --------------------------------------- |
| GET    | `/api/projects`              | —             | List all projects (sorted newest first) |
| POST   | `/api/projects`              | ✅            | Create a new project                    |
| GET    | `/api/projects/:id`          | —             | Get a single project                    |
| PATCH  | `/api/projects/:id`          | ✅ Owner only | Update project details                  |
| POST   | `/api/projects/:id/complete` | ✅ Owner only | Mark project as complete                |

**Valid `stage` values:** `planning` · `building` · `testing` · `launched` · `completed`

### Milestones

| Method | Endpoint                       | Auth | Description                  |
| ------ | ------------------------------ | ---- | ---------------------------- |
| POST   | `/api/projects/:id/milestones` | ✅   | Add a milestone to a project |

### Comments

| Method | Endpoint                     | Auth | Description               |
| ------ | ---------------------------- | ---- | ------------------------- |
| GET    | `/api/projects/:id/comments` | —    | Get comments on a project |
| POST   | `/api/projects/:id/comments` | ✅   | Post a comment            |

### Collaboration

| Method | Endpoint                   | Auth | Description                                              |
| ------ | -------------------------- | ---- | -------------------------------------------------------- |
| GET    | `/api/projects/:id/collab` | —    | List collaboration requests for a project                |
| POST   | `/api/projects/:id/collab` | ✅   | Raise a hand to collaborate (cannot be your own project) |

### Real-time — SSE stream

| Endpoint                       | Description                                   |
| ------------------------------ | --------------------------------------------- |
| `GET /api/projects/:id/events` | Open an SSE stream scoped to a single project |

**Events emitted by the server:**

| Event       | Payload                | Trigger                           |
| ----------- | ---------------------- | --------------------------------- |
| `connected` | `{ projectId }`        | Immediately on stream open        |
| `comment`   | `Comment` object       | New comment posted on the project |
| `collab`    | `CollabRequest` object | New collaboration request raised  |
| `ping`      | _(keepalive)_          | Every 25 seconds                  |

The frontend `openProjectStream(projectId, opts)` helper in `client/src/services/api.ts` wraps the native `EventSource` API and returns a cleanup function suitable for use in a `useEffect` hook.

---

## UML diagrams

Diagrams are stored in [`/docs/uml/`](docs/uml/).

- `use-case.png` — all actor interactions with the system
- `class-diagram.png` — entity model (Developer, Project, Milestone, Comment, CollabRequest)
- `sequence-diagram.png` — project creation → SSE broadcast → milestone update flow

---

## AI usage

MzansiBuilds uses an AI language model to power smart project tag suggestions when a developer creates or edits a project.

**What data is sent:** Only the project title and description text. No personal information, passwords, or private data is transmitted to the AI provider.

**Transparency:** The AI suggestion feature is clearly labelled in the UI. Users can ignore or override any suggestion.

**Full policy:** See [`docs/ai-ethics.md`](docs/ai-ethics.md) for our complete AI ethics and responsible use documentation.

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/your-feature`
2. Write tests first (TDD — Red → Green → Refactor)
3. Commit using Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
4. Open a pull request against `main` — CI must be green before merge

---

## License

MIT © 2026 MzansiBuilds
