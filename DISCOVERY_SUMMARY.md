# Discovery Summary (Phase 1)

Scope: `ExpoBot-hk/api` (read-only scan). Reference folder `aviary` not used.

## Backend entrypoint
- `api/src/main.ts`
  - Koa app + HTTP server
  - Route loader: `api/src/routes/index.ts`
  - Auth middleware: `api/src/controller/auth.ts`
  - DB init: `api/src/mysql/db/index.ts` (via `initDB()`)
  - BullBoard: Express app on port `9999` (`createBullBoard`)
  - Server listen: `config.Backend.port` (default `9090` from `config/default.yml`)

## Route loader structure
- `api/src/routes/index.ts` recursively imports all route files under `api/src/routes/*` and registers `router.use(r.routes())`.

## DB driver / ORM
- Primary ORM: **Sequelize** via `api/src/mysql/db/seq.db.ts` (dialect `mysql`).
- MySQL config source: `config/default.yml` → `MySQL` section.
- Postgres client exists but not wired to main ORM:
  - `api/src/clients/postgres.ts` (pg `Pool` with env vars: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`).
  - Used by flow node `api/src/flow/nodes/postgres.ts` only.

## Redis usage
- Client: `api/src/clients/redis.ts` (ioredis).
- Session cache: `api/src/utils/auth.ts` (keys: `login_tokens`, session key stores JSON).
- Permission refresh flag: `api/src/utils/redis.ts` (`update_userInfo` set).
- ZSET initialization for Ollama endpoints in `api/src/utils/redis.ts`.

## RBAC middleware
- Middleware: `usePermission` in `api/src/controller/auth.ts`.
- Permission resolution: `api/src/utils/permissionResolver.ts` (Role → RoleMenu → Menu.perms, supports comma-separated perms).
- Full user info: `api/src/utils/userInfo.ts` (admin roleKey -> `['*|*']`).
- RBAC-enforced routes:
  - `api/src/routes/role.ts` (`/roles/*`)
  - `api/src/routes/menu.ts` (`/menus/*`)
- Note: User management routes in `api/src/routes/auth.ts` are not protected by `usePermission`.

## Login endpoints
- `POST /user/login` (auth)
- `POST /user/register` (public registration)
- `DELETE /user/logout`
- `GET /user/getInfo`

## Health endpoints
- Health check service exists: `api/src/services/healthCheck.ts`.
- **No route currently exposes health endpoints** (no `/health` or `/api/health` route in `api/src/routes/*`).

## Bull queue usage
- Bull queue: `api/src/queue/jobQueue.ts` (Redis DB 11)
- Worker queues: `api/src/queue/queue.ts` (Redis DB 6)
- BullBoard UI: `http://localhost:9999`

## Environment configuration
- `config/default.yml` is authoritative (loaded by `api/src/config/index.ts` via Zod schema).
- `env-example.md` includes Mongo/Postgres references but **is not wired** to Koa config loading.
- No DGX PostgreSQL settings currently wired into main ORM.

## Key findings relevant to DGX PostgreSQL integration
- ORM is hardcoded to MySQL dialect in `api/src/mysql/db/seq.db.ts`.
- PG client exists but is not part of main data path.
- Any DGX PG integration requires:
  - A DB adapter layer to support both MySQL and PostgreSQL via env.
  - Controlled migrations and compatibility for RBAC tables.

