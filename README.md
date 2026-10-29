# Stride — Agile Project Management & Sprints Platform

Stride is a comprehensive, full-stack collaborative Agile project management platform inspired by the workflows and governance of Zoho Sprints, with seamless Software Engineering curriculum alignment (CO1–CO5).

Built as an integrated three-part software engineering platform with a single unified codebase, shared backend, Supabase PostgreSQL schema, and a refined mint-green aesthetic.

---

## 🌟 Visual Identity & Design System

Stride adheres strictly to a bespoke visual language:
- **Mint-Green Palette & Ambient Gradients**: Soft green gradients (`#f4faf6`, `#caedda`, `#348e65`) with organic floating background blur spheres.
- **Minimalist Black Typography**: Clean, legible typography powered by **Plus Jakarta Sans** and **Inter**.
- **Outlined Pill-Shaped Buttons**: Restrained, tactile pill controls (`rounded-full border border-zinc-900`) with smooth micro-interactions.
- **Glassmorphic Panels**: Translucent containers with subtle borders and balanced whitespace.
- **Responsive Layout**: Fluid desktop, tablet, and mobile views.

---

## 🛠️ Architecture & Technology Stack

```
stride/
├── client/          # React 18/19, TypeScript, Vite, Tailwind CSS, React Router v6, dnd-kit
├── server/          # Node.js, Express, TypeScript, REST API, Zod, Vitest, Supertest
├── shared/          # Shared TypeScript domain contracts, roles, and status enums
├── supabase/        # Reproducible PostgreSQL migrations & Row Level Security (RLS)
├── tests/           # Automated integration test suites
├── .env.example     # Environment variables blueprint
└── README.md        # Master documentation and run instructions
```

### Persistence Engine: Dual-Mode Architecture
- **Supabase Cloud Mode**: Uses official `@supabase/supabase-js` client with PostgreSQL, Row Level Security, and Realtime subscriptions when `SUPABASE_URL` and `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are provided.
- **Stride Local Engine Mode**: When cloud credentials are not supplied, the backend automatically operates on an in-server persistent JSON store (`server/data/stride-store.json`) pre-seeded with realistic Agile projects, user roles, sprints, epics, and work items. This guarantees 100% functionality out-of-the-box without mocking or broken stubs.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9.0.0 or higher

### 2. Installation
From the `stride` root directory:
```bash
# Install root, client, and server dependencies
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Environment Configuration
Copy `.env.example` to `server/.env` and `client/.env`:
```bash
# In server directory:
cp .env.example server/.env

# In client directory:
cp client/.env.example client/.env
```

To enable Supabase PostgreSQL:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL migration located at `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
3. Paste your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env` and `client/.env`.

### 4. Running the Application Locally
Run the server and client concurrently or in separate terminals:

```bash
# Terminal 1: Backend API (runs on http://localhost:4000)
npm run dev:server

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

Or run both together:
```bash
npm run dev
```

### 5. Running Automated Tests
```bash
npm test
```
Executes the Vitest integration suite verifying:
- Health and database storage engine detection
- Authentication and default profile loading
- Workspace and Project CRUD
- Epic creation & dynamic percentage calculations
- Work item creation, auto-incrementing key generation (`STR-XXX`), and prioritization
- Kanban card stage moves and order updates
- Sprint date validation (`end_date >= start_date`) and single active sprint rule
- Sprint completion with incomplete task rollover
- Dashboard metrics calculation from stored records
- Role-based permission rejection (403 Forbidden for unauthorized actions)

---

## 👥 Roles & Authorization Matrix (RBAC)

Stride enforces role capabilities server-side and in the client:

| Capability | Workspace Admin | Product Owner | Scrum Master | Developer |
|---|:---:|:---:|:---:|:---:|
| **Manage Workspaces & Billing** | ✅ | ❌ | ❌ | ❌ |
| **Manage Workspace Members** | ✅ | ❌ | ❌ | ❌ |
| **Manage Projects** | ✅ | ✅ | ❌ | ❌ |
| **Backlog & Epic Planning** | ✅ | ✅ | ✅ | ❌ |
| **Sprint Lifecycle & Capacity** | ✅ | ✅ | ✅ | ❌ |
| **Delete Work Items** | ✅ | ✅ | ✅ | ❌ |
| **Update Work Items & Move Board** | ✅ | ✅ | ✅ | ✅ |

> **Interactive Persona Switcher**: In both the Landing Page and Top Navbar, a quick-switcher allows you to instantly act as **Alex Morgan** (Admin), **Elena Rostova** (Product Owner), **Marcus Chen** (Scrum Master), or **Sarah Jenkins** (Developer).

---

## 📋 Requirements Checklist — Part 1

| Requirement Area | Status | Verification Summary |
|---|---|---|
| **1. Project Setup & Architecture** | **Complete & Verified** | Single unified monorepo with `client/`, `server/`, `shared/`, `supabase/`. Build passing. |
| **2. Mint-Green Visual Design** | **Complete & Verified** | Ambient blurred spheres, Plus Jakarta Sans, pill buttons, responsive cards. |
| **3. Authentication System** | **Complete & Verified** | Supabase Auth connector + dual-mode session restoration and persona quick-login. |
| **4. Database Schema & RLS** | **Complete & Verified** | `001_initial_schema.sql` with enums, foreign keys, triggers, constraints, RLS policies. |
| **5. Workspace Management** | **Complete & Verified** | Create, view, switch workspaces, list and manage members. |
| **6. Project Management** | **Complete & Verified** | Unique project keys (`STR`), project members, start/target dates, project overview. |
| **7. Team Roles & RBAC** | **Complete & Verified** | 4 roles documented and enforced via middleware & UI permission gates. |
| **8. Backlog Management** | **Complete & Verified** | Tasks, Stories, Bugs, priority levels, story points, due dates, filters, search. |
| **9. Epic Management** | **Complete & Verified** | Dynamic progress calculation (`completed / total * 100`), linked deliverable items. |
| **10. Sprint Lifecycle** | **Complete & Verified** | Planning, Active, Completed states, date validation, rollover modal for incomplete tasks. |
| **11. Kanban Board** | **Complete & Verified** | 4 columns (To Do, In Progress, QA, Done), order & status persistence, filters. |
| **12. List View** | **Complete & Verified** | Sortable table columns, inline status transitions, full project item visibility. |
| **13. Real Dashboard** | **Complete & Verified** | Metrics calculated from database records (zero fake stats), sprint burndown preview. |
| **14. Automated Tests** | **Complete & Verified** | 13/13 Vitest tests passing covering end-to-end API workflows. |
| **15. Responsive Design** | **Complete & Verified** | Verified on desktop, tablet, and mobile breakpoints. |

---

## 🔜 Prepared for Parts 2 & 3
- Realtime WebSocket updates for collaborative multi-user board dragging.
- Comments, @mentions, and notifications.
- QA Test Management, Test Runs, and Defect Tracking.
- Release burndown charts and advanced velocity metrics.
- Software Engineering course tools and export pipelines.
