# Lybrexa OS

A private AI operating system — your persistent cognitive extension. Dark cyberpunk command deck with specialist AI agents, persistent memory, and full workspace modules.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/lybrexa-os run dev` — run the frontend (port 19581, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build lib declarations (run before leaf typechecks after lib changes)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind + wouter routing + framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: OpenAI GPT-4o-mini via `@workspace/integrations-openai-ai-server`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/` — generated React Query hooks and custom fetch
- `lib/api-zod/` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle schema (users, conversations, messages, notes, tasks, journal, projects, goals, memories, agent_runs)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/agents/orchestrator.ts` — AI agent router (6 specialist agents)
- `artifacts/api-server/src/lib/auth.ts` — JWT auth helpers
- `artifacts/lybrexa-os/src/` — React frontend (pages/, hooks/, components/)

## Architecture decisions

- JWT-based auth stored in `localStorage` as `lybrexa_token`; injected via `setAuthTokenGetter` in `main.tsx`
- Agent routing is signal-based: message keywords map to specialist agents (coding, research, strategy, planning, memory, devilAdvocate, general)
- OpenAI uses direct API key (`OPENAI_API_KEY`) without proxy; the `lib/integrations-openai-ai-server` image client was patched to not throw at import time when AI_INTEGRATIONS vars are absent
- `lib/integrations-openai-ai-react` requires `@types/react` devDep and `"types": ["react"]` in its tsconfig to build correctly

## Product

- **Chat**: Multi-conversation AI chat with 6 specialist agents automatically routed by message content
- **Dashboard**: HUD-style command overview with live stats and activity feed
- **Notes**: Quick capture with tags and search
- **Tasks**: Kanban-style tracker with priority and status (TODO/IN_PROGRESS/BLOCKED/DONE)
- **Journal**: Daily entries with mood tracking (1-10 scale)
- **Projects**: Project tracker with task counts and repo links
- **Goals**: Goal tracker with time horizons (SHORT/MEDIUM/LONG/LIFE) and progress bars
- **Memory**: Browseable knowledge graph with importance scoring by category

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` before leaf artifact typechecks when lib code changes
- The API server uses `esbuild` bundling — `pnpm run typecheck` is fine but `pnpm run build` requires `PORT` and `BASE_PATH` env vars from the workflow config
- Chat endpoint returns a 500 if `OPENAI_API_KEY` is invalid or quota-exceeded; this is expected behavior
- The `image/client.ts` in `lib/integrations-openai-ai-server` must NOT throw at module-load time — use optional env checks only

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
