---
"questpie": patch
"@questpie/admin": patch
---

Remove deprecated collection/global scoped `.functions()` RPC from builders and runtime routes. RPC is now app-level only via `rpc().router(...)` on `/rpc/:path...`.

Update docs to match current behavior:
- runtime install baseline is `questpie` (add `zod`/`drizzle-orm` only when imported directly)
- explicit sidebar items are automatically excluded from the auto-generated section
- `where.RAW` now documents and supports object args with optional i18n aliases via `({ table, i18nCurrentTable, i18nFallbackTable })`

Live preview now runs only for existing collection records (edit mode with an id) and resolves preview URLs from persisted DB values instead of unsaved form state, preventing stuck loading when fields like slug are edited before save.

Relation list cells now support `meta.admin.listCell` options for richer table rendering. Setting `display: "avatarChip"` shows relation chips with avatar thumbnails, with optional `avatarField` and `labelField` dot-paths.

List view relation auto-expansion now detects nested avatar relation paths (for example `avatar.url`) and requests nested relation data so avatar chips render without manual `with` configuration.

Add upload/system field introspection (including synthetic `preview`) so assets can render preview + upload metadata reliably from schema.

Update default assets admin config to show preview in list and form sidebar.

Add real user admin actions in defaults:
- header `createUser` (name/email/password/role)
- single-item `resetPassword` (new + confirm)
- wired to Better Auth admin API calls with session bearer token

Polish user form behavior:
- email becomes read-only on existing records
- ban reason/expiry only show when banned

Improve server action client mapping/execution with real form field mapping, RPC execution, and effects handling.
