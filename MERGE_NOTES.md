# ExpoBot-hk + Aviary (Reference) Integration Notes

This repo now includes the Aviary starter kit as a **reference folder**:

- `./aviary/` (reference only)

The running backend remains **ExpoBot-hk/api**.

## What was integrated (no runtime merge)

### RBAC fixes (MySQL → Redis session)
- Non-admin permissions are now computed correctly:
  `user -> roles -> role_menu -> menu.perms`
- `menu.perms` supports comma-separated values.
- Admin roleKey `admin` gets wildcard permissions: `['*|*']`.

### Session refresh on role assignment
- When assigning a role to a user, the user is added to the Redis set `update_userInfo` so their session is refreshed automatically on their next request.

### Auth whitelist normalization
- `/system/menu/list` whitelist path is normalized (leading slash).

## Why this approach
Directly merging two full backends creates duplicate bootstraps/routes/config and slows development. This repo keeps Aviary as a reference implementation and ports only the needed patterns into ExpoBot.
