# Validation Prompt: Admin Client Consistency Refactoring

Use this prompt to validate the Phase G refactoring of `packages/admin/src/client/` against the original design requirements.

---

## Core Demands

Verify each point below. For each, answer YES/NO and note any deviations.

### 1. Plain frozen objects from ALL factories

> "Everything declarative, nothing imperative. All configuration must be expressed as data."

- [ ] `field()` returns `Object.freeze()`'d plain object `{ name, component, cell? }`
- [ ] `view()` returns `Object.freeze()`'d plain object `{ name, kind, component }`
- [ ] `page()` returns `Object.freeze()`'d plain object `{ name, component, path?, showInNav? }`
- [ ] `widget()` returns `Object.freeze()`'d plain object `{ name, component }`
- [ ] No builder classes remain (`FieldBuilder`, `ListViewBuilder`, `FormViewBuilder`, `PageBuilder`, `WidgetBuilder`)
- [ ] No `.$options()`, `.$config()`, `.withCell()`, `.path()` method chains exist

### 2. No config on FE definitions — server provides everything

> "No config should be needed for frontend admin defs that just mirror server defs — props/config types should be reused from server."

- [ ] `FieldDefinition` has NO `~options`, NO `config`, NO `validator`, NO `createZod` — just `{ name, component, cell? }`
- [ ] `ViewDefinition` has NO `~config`, NO `config` — just `{ name, kind, component }`
- [ ] `WidgetDefinition` has NO `~config` — just `{ name, component }`
- [ ] Runtime field config comes from `FieldInstance` (created by `configureField()` from server data)
- [ ] `configureField(baseDef, serverOptions)` is the ONLY way to attach options

### 3. No proxies/registries on FE

> "No need for proxies and registries on FE in admin too — that is legacy stuff."

- [ ] `proxies.ts` file is deleted
- [ ] `FieldRegistryProxy`, `ViewRegistryProxy` types are gone
- [ ] `createFieldRegistryProxy`, `createViewRegistryProxy` functions are gone
- [ ] Any remaining proxy usage in object-field/object-array-field is inlined as `configureField()` calls

### 4. AdminBuilder is gone

> "All old admin builder is gone not needed — introspection and data flow from server — FE is pure flat map for rendering."

- [ ] `admin-builder.ts` file is deleted
- [ ] `AdminBuilder` class is gone — no `.empty()`, no `.fields()`, `.views()`, `.widgets()`, `.pages()`, `.use()`
- [ ] `AdminBuilderState` deprecated alias is removed
- [ ] `AdminState` is a plain interface (not a class), flat map of: `fields, views, pages, widgets, components, blocks, translations, locale`
- [ ] Module composition is done via plain object spread, not `.use()` chain

### 5. FE is pure flat map for rendering

> "Just maps by types and names."

- [ ] `AdminState.fields` is `Record<string, FieldDefinition>` — flat name→component map
- [ ] `AdminState.views` is `Record<string, ViewDefinition>` — flat name→{kind, component} map
- [ ] `AdminState.pages` is `Record<string, PageDefinition>` — flat name→{component, path?} map
- [ ] `AdminState.widgets` is `Record<string, WidgetDefinition>` — flat name→component map
- [ ] No nested state, no builder wrappers, no `.state` extraction needed

### 6. defaults/ directory deleted

> "Core parts added by modules must follow the same principles as if the user added them manually."

- [ ] `defaults/fields.tsx` is deleted
- [ ] `defaults/views.ts` is deleted
- [ ] `defaults/pages.ts` is deleted
- [ ] `defaults/widgets.ts` is deleted
- [ ] `defaults/components.ts` is deleted
- [ ] Each module client field file (18 files in `server/modules/admin/client/fields/`) is self-contained — imports `field()` + component directly

### 7. Centralized validation

- [ ] `buildZodFromIntrospection()` exists in `validation.ts`
- [ ] `FIELD_VALIDATORS` registry handles 10 special-case field types
- [ ] Generic resolution via `resolveBaseType()` + `applyConstraints()` for simple fields
- [ ] No per-field `createZod` callbacks on `FieldDefinition`
- [ ] `buildValidationSchema(fields)` takes 1 argument (field instances), not 2

### 8. Consistent naming

> "Same concepts must use the same names across server, client, codegen, and runtime."

- [ ] `AdminState` (not `AdminBuilderState`)
- [ ] `FieldDefinition` (registry entry), `FieldInstance` (configured at runtime)
- [ ] `ViewDefinition` (not `ListViewBuilderState` or `FormViewBuilderState`)
- [ ] No `"~config"` on views — just `config` flows from server

### 9. Docstrings updated

- [ ] No references to `qa()` or `coreAdminModule` in JSDoc
- [ ] Examples reference codegen: `import admin from "#questpie/admin/.generated/client"`

### 10. Tests pass

- [ ] `cd packages/admin && bun test test/builder/` — all pass
- [ ] `npx tsc --noEmit --project packages/admin/tsconfig.json` — only pre-existing server errors (StarterCollections/StarterJobs)

---

## How to validate

```bash
# 1. Run tests
cd packages/admin && bun test test/builder/

# 2. TypeScript check
cd /path/to/repo && npx tsc --noEmit --project packages/admin/tsconfig.json

# 3. Verify no builder classes remain
grep -rn "class.*Builder" packages/admin/src/client/builder/ --include="*.ts" --include="*.tsx"
# Expected: no results

# 4. Verify no proxies remain
ls packages/admin/src/client/builder/proxies.ts 2>/dev/null
# Expected: "No such file or directory"

# 5. Verify no defaults remain
ls packages/admin/src/client/builder/defaults/ 2>/dev/null
# Expected: "No such file or directory"

# 6. Verify all field definitions are plain frozen objects
grep -n "Object.freeze" packages/admin/src/client/builder/field/field.ts packages/admin/src/client/builder/view/view.ts packages/admin/src/client/builder/page/page.ts packages/admin/src/client/builder/widget/widget.ts

# 7. Verify self-contained module fields
head -5 packages/admin/src/server/modules/admin/client/fields/text.ts
# Expected: imports field() and component directly, no defaults/ import
```
