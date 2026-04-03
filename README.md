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
3. **Live feed** — browse a real-time feed of what the community is building, powered by WebSockets.
4. **Collaboration** — comment on any project or raise a hand to request collaboration.
5. **Milestones** — continuously log progress milestones against a project.
6. **Celebration Wall** — completing a project adds the developer to a shared Celebration Wall.

---

## Architecture

```
mzansibuilds/
├── client/          # React + TypeScript (Vite) — frontend SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/   # API + WebSocket clients
│   │   └── types/
│   └── ...
├── server/          # Node.js + Express + TypeScript — REST API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── services/
│   │   └── tests/
│   └── ...
├── docs/
│   ├── uml/         # Use-case, class and sequence diagrams
│   └── ai-ethics.md
└── .github/
    └── workflows/
        └── ci.yml
```

**Key architectural decisions:**

- REST API for CRUD operations; WebSockets (Socket.IO) for the live feed and real-time milestone updates.
- JWT-based authentication with short-lived access tokens and refresh tokens.
- PostgreSQL as the primary database (via Prisma ORM).
- All secrets injected via environment variables — never hardcoded.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Real-time | Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Security | Helmet, express-rate-limit |
| Testing | Jest, Supertest (backend) · Vitest, React Testing Library (frontend) |
| CI/CD | GitHub Actions |

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
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

### Database setup

```bash
cd server
cp ../.env.example .env        # fill in your values
npx prisma migrate dev         # run migrations
npx prisma db seed             # optional: seed demo data
```

### Run in development

```bash
# Terminal 1 — backend (hot reload)
cd server && npm run dev

# Terminal 2 — frontend (hot reload)
cd client && npm run dev
```

The API runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

API docs (Swagger UI) are available at `http://localhost:5000/api-docs`.

---

## Environment variables

Copy `.env.example` to `.env` inside the `server/` directory and fill in the values. **Never commit `.env`.**

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the API server listens on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/mzansibuilds` |
| `JWT_SECRET` | Secret key for signing access tokens | *(long random string)* |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | *(long random string)* |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `AI_API_KEY` | API key for AI provider | *(see AI usage section)* |
| `NODE_ENV` | Runtime environment | `development` |

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

Tests follow a strict **Red → Green → Refactor** TDD cycle. Every route and core component has a corresponding test file. CI enforces that no code merges to `main` unless all tests pass.

---

## API reference

Interactive docs are served by Swagger UI at `/api-docs` when the server is running.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new developer account |
| POST | `/api/auth/login` | Log in and receive JWT tokens |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Developers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/developers/:id` | Get a developer's public profile |
| PATCH | `/api/developers/:id` | Update own profile |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all projects (paginated feed) |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/:id` | Get a single project |
| PATCH | `/api/projects/:id` | Update a project |
| POST | `/api/projects/:id/complete` | Mark project as complete |

### Milestones

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects/:id/milestones` | Add a milestone |
| GET | `/api/projects/:id/milestones` | List milestones for a project |

### Comments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects/:id/comments` | Get comments on a project |
| POST | `/api/projects/:id/comments` | Post a comment |

### Collaboration

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects/:id/collaborate` | Raise a hand for collaboration |
| PATCH | `/api/collaborate/:requestId` | Accept or reject a request |

### Celebration Wall

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/celebration` | Get all completed projects on the wall |

### WebSocket events

| Event | Direction | Payload |
|---|---|---|
| `project:new` | Server → Client | New project created |
| `milestone:added` | Server → Client | Milestone posted |
| `comment:new` | Server → Client | New comment on a project |
| `collaborate:request` | Server → Client | Collaboration request received |

---

## UML diagrams

Diagrams are stored in [`/docs/uml/`](docs/uml/).

- `use-case.png` — all actor interactions with the system
- `class-diagram.png` — entity model (Developer, Project, Milestone, Comment, CollaborationRequest, CelebrationEntry)
- `sequence-diagram.png` — project creation → live feed broadcast → milestone update flow

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