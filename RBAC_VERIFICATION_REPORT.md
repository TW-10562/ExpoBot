# RBAC Verification Report

## Environment
- Date: 2026-02-05
- Backend path: `api`
- Backend base URL (default): `http://localhost:9090` (from `config/default.yml` -> `Backend.host`/`Backend.port`)
- BullBoard URL: `http://localhost:9999/` (from `api/src/main.ts`)
- MySQL config (non-secret): host `localhost`, port `3307`, database `aviary-db`, user `aviaryAdmin`, password `<redacted>`
- Redis config (non-secret): host `localhost`, port `6379`, db `0`, password `<redacted>`
- Runtime services used for verification: `expoproj-mysql-1`, `expoproj-redis-1`

## Endpoints discovered
- Login endpoint:
  - `POST /user/login` (`api/src/routes/auth.ts`)
- Auth/User endpoints (not protected by `usePermission`):
  - `GET /user/list`, `POST /user/create`, `PUT /user/update`, `PUT /user/profile`, `DELETE /user/:id`
- RBAC-protected endpoints (`usePermission`):
  - Roles: `GET /roles/`, `POST /roles/`, `PUT /roles/`, `DELETE /roles/role/:id`, `POST /roles/user/bind`, `POST /roles/file/bind`
  - Menus: `GET /menus/list`, `POST /menus/`, `PUT /menus/`, `DELETE /menus/:id`, `GET /menus/:id`
- BullBoard endpoint:
  - `GET http://127.0.0.1:9999/` -> `200`
- Health endpoint:
  - No explicit health route registered in `api/src/routes/*`
  - Probes with admin token: `/health`, `/api/health`, `/status`, `/api/status` -> all `404`

## Verify system runnable
- `npm i` in `api/` timed out in sandbox, but `api/node_modules` already existed.
- API server process was already running and responding on `:9090`.
- BullBoard responds on `:9999`.
- Redis connectivity confirmed: `PONG`; keyspace includes `db11` Bull keys.

## Database schema verification
### RBAC tables existence (MySQL)
`SHOW TABLES` includes:
- `user`, `role`, `sys_menu`, `user_role`, `role_menu`, `file_role` (present)

### Column verification
- `roleKey` column: `role.role_key`
- `perms` column: `sys_menu.perms`
- User soft-delete-related columns: `user.deleted_at`, `user.deleted_by`

### Hard delete vs soft delete
- **Soft delete** is implemented in service code:
  - `api/src/service/user.ts` -> `deleteUser()` updates `deleted_at` (and attempts `delete_by`)
- Note: code writes `delete_by` but column is `deleted_by` (bug; see Risks section).

## Fixtures prepared
Executed idempotent SQL in MySQL:
- ensured admin user exists (`user_name='admin'`, role key `admin` already existed)
- created `testuser` / `test123`
- created role `viewer` (`role_key='viewer'`)
- created menu with perms `R|user`
- mapped `viewer -> menu` (`role_menu`)
- mapped `testuser -> viewer` (`user_role`)

Evidence after fixture setup:
- `testuser` created as `user_id=5`
- `viewer` created as `role_id=3`
- `viewer -> R|user` mapping present

## RBAC Tests
| Test | Expected | Actual | Result | Evidence |
|---|---|---|---|---|
| A) Login as admin | 200 | 200 | PASS | `POST /user/login` -> `admin_login_status:200` |
| B) Login as testuser | 200 | 200 | PASS | `POST /user/login` -> `testuser_login_status:200` |
| C) testuser call endpoint requiring `R\|user` | 200 | BLOCKED | BLOCKED | No route currently enforces `R\|user` via `usePermission` |
| D) testuser call admin endpoint (`C\|role`) | 403 | 403 | PASS | `POST /roles/` -> `{"code":"403","message":"アクセス権限がありません"}` |
| E) admin call same endpoint | 200 | 200 | PASS | `POST /roles/` -> `{"code":200,"message":"操作は成功しました"}` |

Additional evidence:
- `GET /roles/` with testuser token -> `403`
- `GET /roles/` with admin token -> `200`
- `GET /user/list` with testuser token -> `200` (this endpoint is not RBAC-protected)

### Commands used (sanitized)
```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"userName":"admin","password":"12345"}' \
  http://127.0.0.1:9090/user/login

curl -s -H 'Content-Type: application/json' \
  -d '{"userName":"testuser","password":"test123"}' \
  http://127.0.0.1:9090/user/login

curl -s -H 'Authorization: Bearer <testuser_token_redacted>' \
  http://127.0.0.1:9090/roles/

curl -s -X POST -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <testuser_token_redacted>' \
  -d '{"roleName":"qa_nope","roleKey":"qa_nope","status":"0","roleSort":1,"menuIds":[],"remark":"qa"}' \
  http://127.0.0.1:9090/roles/

curl -s -X POST -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin_token_redacted>' \
  -d '{"roleName":"qa_temp_role","roleKey":"qa_temp_role","status":"0","roleSort":77,"menuIds":[],"remark":"qa temp"}' \
  http://127.0.0.1:9090/roles/
```

## Session Refresh Tests
Goal: verify same token gains/loses admin access after role changes via refresh flag (`update_userInfo`) without relogin.

| Step | Expected | Actual | Result | Evidence |
|---|---|---|---|---|
| Baseline with same testuser token on admin endpoint | 403 | 403 | PASS | `GET /roles/` -> `403` |
| Promote testuser (bind admin role) | bind API 200 | 200 | PASS | `POST /roles/user/bind` with admin token -> `200` |
| Same testuser token immediately after promote | 200 | 200 | PASS | first request after bind already `200` |
| Demote testuser (remove admin role + set refresh flag) | role removed + flag set | done | PASS | SQL delete + `SADD update_userInfo 5` |
| Same testuser token after demote | 403 | 403 | PASS | first request after demotion marker already `403` |

Timing observation:
- Refresh took effect on the **next request** with same token (no relogin required).

### Commands used (sanitized)
```bash
# promote
curl -s -X POST -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin_token_redacted>' \
  -d '{"roleId":1,"userId":5}' \
  http://127.0.0.1:9090/roles/user/bind

# demote + refresh marker
docker exec expoproj-mysql-1 mysql -uaviaryAdmin -p'<redacted>' -D 'aviary-db' \
  -e "DELETE FROM user_role WHERE user_id=5 AND role_id=1;"

docker exec expoproj-redis-1 redis-cli -a '<redacted>' SADD update_userInfo 5
```

## User Management Tests
Operations run using APIs + SQL verification.

| Operation | API Result | SQL Verification | Result |
|---|---|---|---|
| Create `user2` | `POST /user/create` -> 200 | `user_id=6`, status `0`, expected fields written | PASS |
| Assign viewer role to `user2` | `POST /roles/user/bind` -> 200 | `user_role` contains `(6,3)` | PASS |
| Update `user2` properties | `PUT /user/update` -> 200 | email/phone updated (`user2-updated@example.local`, `999`) | PASS |
| Disable `user2` | `PUT /user/profile` -> 200 | `user.status=0` | PASS |
| Session refresh flag set for role bind | N/A | Redis `SMEMBERS update_userInfo` included `6` | PASS |

Additional check:
- Disabled `user2` could still log in (`POST /user/login` -> 200). This is likely incorrect behavior.

### SQL evidence snippets
- After bind: `user_role` for `user_id=6` includes `role_id=3`
- After update/disable: `user(6)` -> email `user2-updated@example.local`, phone `999`, status `0`

## BullBoard and queues
- `GET http://127.0.0.1:9999/` -> `200` (HTML returned)
- Redis connectivity: `PONG`
- Redis keyspace includes `db11` and Bull keys (`bull:jobQueue:*`), indicating queue initialization present and not crashing.

## Risks / Bugs found
1. `R|user` RBAC not enforced by any route (design/implementation gap)
   - Files: `api/src/routes/auth.ts`, `api/src/routes/*`
   - Details: user-management routes are missing `usePermission(PERMISSIONS.READ_USER/CREATE_USER/UPDATE_USER/DELETE_USER)`.
   - Fix: apply `usePermission(...)` middleware on relevant `/user/*` routes.

2. No health endpoint registered
   - Files: `api/src/services/healthCheck.ts`, `api/src/routes/*`
   - Details: health service exists but no route wiring; `/api/health` returns 404.
   - Fix: add route(s) e.g. `GET /health` and/or `GET /api/health` using `healthCheckService`.

3. Disabled users can still authenticate
   - File: `api/src/controller/user.ts`
   - Details: `loginVal` validates password but does not block `status != '1'`.
   - Fix: enforce active-status check before issuing token.

4. Soft-delete field typo likely drops deleter audit
   - File: `api/src/service/user.ts`
   - Details: updates `delete_by`, schema column is `deleted_by`.
   - Fix: change `delete_by` -> `deleted_by`.

5. Menu schema validation appears incorrect
   - File: `api/src/routes/menu.ts`
   - Details: menu add/put uses role Joi schemas imported from `routes/role.ts` (`addJudg`/`putJudg`).
   - Fix: define menu-specific Joi schemas for `/menus` endpoints.

6. High-risk auth whitelist includes write endpoints
   - File: `api/src/controller/auth.ts`
   - Details: whitelist includes messaging/support write/read endpoints; unauthenticated fallback can inject test user context.
   - Fix: tighten whitelist to true public endpoints only.

## Next actions
- [ ] Protect `/user/*` management routes with explicit RBAC middleware.
- [ ] Add and test health endpoint (`/api/health`) returning 200.
- [ ] Block login for disabled users.
- [ ] Fix `deleted_by` typo in soft-delete path.
- [ ] Add automated integration test for refresh-flag behavior (promote/demote with same token).
- [ ] Add regression tests for menu validation schemas.

