# RFC: Immutable Field Builder (V2)

> Status: **Implemented** (type inference fix in progress)
> Authors: @drepkovsky
> Date: 2026-02-28

---

## Summary

Replace the V1 config-bag field pattern with an **immutable builder pattern** (V2). Each field is a `Field<TState>` instance where chained methods grow the type state monotonically — exactly like Drizzle ORM's column builders.

**What changes:** How fields are defined and how their types flow.
**What stays identical:** Collection builder, global builder, CRUD layer, admin, migrations, adapters — all consume the same `FieldDefinition` interface.

---

## Motivation

The V1 config-bag pattern (`f.text({ required: true, maxLength: 255 })`) has four structural problems:

1. **Lost Drizzle generics** — `toColumn` uses `let column: any`, destroying notNull/hasDefault type tracking
2. **Parallel conditional logic** — `multiple: true` checked in 4 places (column, zod, operators, metadata)
3. **Fragile centralized type narrowing** — `NarrowFieldValue` is a 50-line conditional type that must be updated for every new field variant
4. **No composition** — can't do `f.text().array()`, must use separate `f.array({ of: f.text() })`

---

## Design

### Core: `Field<TState>`

A single immutable class. Every builder method returns a **new instance** with updated type state via intersection:

```ts
// TState grows monotonically — never loses information
f.text(255)                    // Field<{ type: "text", data: string, notNull: false, ... }>
  .required()                  // Field<{ ... } & { notNull: true }>
  .default("")                 // Field<{ ... } & { hasDefault: true }>
  .label({ en: "Name" })      // Field<{ ... } & { label: I18nText }>
  .admin({ placeholder: "…" }) // Field<{ ... } & { admin: { placeholder: string } }>
```

### Type State Interface

```ts
// field-class-types.ts
interface FieldState {
  type: string;                    // "text", "number", "relation", etc.
  data: unknown;                   // Runtime data type (string, number, etc.)
  column: unknown;                 // Drizzle column builder type
  notNull: boolean;                // narrowed to true by .required()
  hasDefault: boolean;             // narrowed to true by .default()
  localized: boolean;              // narrowed to true by .localized()
  virtual: boolean;                // narrowed to true by .virtual()
  input: boolean | "optional";     // narrowed by .inputFalse() / .inputOptional()
  output: boolean;                 // narrowed by .outputFalse()
  isArray: boolean;                // narrowed to true by .array()
  operators: OperatorSetDefinition; // query operators for WHERE clause
}
```

Each factory (e.g. `text()`) returns `Field<TextFieldState>` where:

```ts
type TextFieldState = DefaultFieldState & {
  type: "text";
  data: string;
  operators: typeof stringOps;
};
```

### Phantom Property `_`

The `_` phantom property on `Field<TState>` carries the type state for external type extractors:

```ts
class Field<TState extends FieldState = FieldState> {
  declare readonly _: TState;  // phantom — never assigned at runtime
  // ...
}
```

Type selectors dispatch on `_`:

```ts
// FieldSelect — "what value sits in the row?"
type FieldSelect<TFieldDef> =
  TFieldDef extends { readonly _: infer TState extends FieldState }
    ? V2FieldSelect<TState>      // V2 path: read from phantom
    : TFieldDef extends FieldDefinition<infer TState>
      ? /* V1 legacy path */
      : never;
```

### Runtime State vs Type State

Two separate representations:

| | Purpose | Mutable? | Generic? |
|---|---|---|---|
| `TState` (type-level) | Type inference chain | Immutable (intersection) | Yes — `Field<TState>` |
| `FieldRuntimeState` (value-level) | Runtime column/schema/operator generation | Frozen object | No — single interface |

The `TState` generic carries compile-time information (data type, notNull, operators). The `FieldRuntimeState` carries runtime values (column factories, schema factories, validation constraints).

### FieldDefinition Compatibility

V2 `Field` implements the `FieldDefinition` interface structurally:

```
FieldDefinition interface       Field class
─────────────────────────       ───────────
state: TState                   get state(): FieldDefinitionState
$types: { value, column, … }   get $types(): { value: unknown, … }
toColumn(name)                  toColumn(name)
toZodSchema()                   toZodSchema()
getOperators()                  getOperators()
getMetadata()                   getMetadata()
```

This means V2 fields work everywhere V1 `FieldDefinition` was expected — collection builder, CRUD layer, admin introspection.

---

## Factory Functions

Each field type is a standalone factory in `builtin-factories/`:

```
builtin-factories/
├── text.ts          → f.text(255), f.text({ mode: "text" })
├── textarea.ts      → f.textarea()
├── email.ts         → f.email()
├── url.ts           → f.url()
├── number.ts        → f.number()
├── boolean.ts       → f.boolean()
├── date.ts          → f.date()
├── datetime.ts      → f.datetime()
├── time.ts          → f.time()
├── select.ts        → f.select(["a", "b", "c"])
├── upload.ts        → f.upload()
├── relation.ts      → f.relation("users"), f.relation(() => users)
├── object.ts        → f.object({ nested: f.text() })
├── json.ts          → f.json()
└── from.ts          → f.from(customFieldDef)
```

Each factory:
1. Returns `Field<SpecificFieldState>` with type, data, and operators set
2. Provides a `columnFactory` (Drizzle column builder creator)
3. Provides a `schemaFactory` (Zod schema creator)
4. Provides an `operatorSet` (query operators)
5. Optionally provides a `metadataFactory` (custom metadata builder)

### Chain Methods

Field-type-specific chain methods are declared on the `Field` class and implemented via prototype patches in factory files:

```ts
// Declared in field-class.ts:
class Field<TState> {
  // Common
  required(): Field<TState & { notNull: true }>;
  default<V>(value: V | (() => V)): Field<TState & { hasDefault: true }>;
  label(l: I18nText): Field<TState & { label: I18nText }>;
  localized(): Field<TState & { localized: true }>;
  virtual(expr?: SQL): Field<TState & { virtual: true; _noColumn: true }>;
  array(): Field<ArrayFieldState<TState>>;

  // Text-specific (runtime impl in builtin-factories/text.ts)
  pattern(re: RegExp): Field<TState>;
  trim(): Field<TState>;
  lowercase(): Field<TState>;
  uppercase(): Field<TState>;

  // Number-specific (runtime impl in builtin-factories/number.ts)
  min(n: number): Field<TState>;
  max(n: number): Field<TState>;
  positive(): Field<TState>;
  int(): Field<TState>;

  // Relation-specific (runtime impl in builtin-factories/relation.ts)
  hasMany(config): Field<TState & { virtual: true; _noColumn: true; _noSelect: true }>;
  manyToMany(config): Field<TState & { virtual: true; _noColumn: true; _noSelect: true }>;
  multiple(): Field<TState>;
  onDelete(action): Field<TState>;

  // Date-specific
  autoNow(): Field<TState>;
  autoNowUpdate(): Field<TState>;

  // Select-specific
  enum(enumName: string): Field<TState>;
}
```

---

## Operator System

Operators are defined as `OperatorSetDefinition` objects with `column` and `jsonb` variants:

```ts
export const stringOps = {
  column: { eq: eqOp, neq: neOp, like: likeOp, ilike: ilikeOp, ... },
  jsonb:  { eq: jsonbEqOp, neq: jsonbNeOp, ... },
} as const satisfies OperatorSetDefinition;
```

Each field factory picks its operator set. The system auto-selects column vs jsonb variant based on field context (main table column vs JSONB path).

Builtin operator sets: `stringOps`, `numericOps`, `booleanOps`, `dateOps`, `belongsToOps`, `toManyOps`, `multipleOps`, `selectMultiOps`.

---

## Type Extraction Chain

The full inference chain from field to hook context:

```
Field<TState>
  │
  ├─ _ (phantom) ← TState
  │
  ├─ FieldSelect<TFieldDef>         reads _.data, _.notNull, _.output
  ├─ FieldWhere<TFieldDef>          reads _.operators.column
  ├─ ExtractInputType<TState>       reads _.data, _.notNull, _.hasDefault, _.input
  │
  ▼
CollectionBuilder.fields(({ f }) => ({
  title: f.text(255).required(),
  content: f.text({ mode: "text" }).localized(),
}))
  │
  ├─ ExtractFieldsByLocation<TFields, "main" | "i18n" | "virtual" | "relation">
  ├─ ExtractColumnsFromFieldDefinitions<TFields>
  ├─ ExtractOutputTypes<TFields>      → FieldSelect per field
  ├─ ExtractInputObject<TFields>      → FieldInput per field
  │
  ▼
CollectionSelect<TState>  = { title: string, content: string | null, ... }
CollectionInsert<TState>  = { title: string, content?: string | null, ... }
CollectionUpdate<TState>  = Partial<CollectionInsert>
  │
  ▼
HookContext<TData, TOriginal, TOperation>
  │  data: CollectionSelect  (in afterRead/afterChange)
  │  data: CollectionInsert  (in beforeChange)
  │
  ▼
TablesFromConfig → ctx.tables.posts  (Drizzle PgTableWithColumns)
```

### Dual Dispatch (V2 + V1)

Every type extractor checks for V2 `Field` first (via `_` phantom), then falls through to V1 `FieldDefinition`:

```ts
// Pattern used everywhere:
TFieldDef extends { readonly _: infer TState extends FieldState }
  ? /* V2 path — compute from TState */
  : TFieldDef extends FieldDefinition<infer TState>
    ? /* V1 path — read from TState["output"] etc. */
    : never;
```

---

## System Fields

System fields (id, createdAt, updatedAt, _title, deletedAt, upload fields) are real V2 `Field` instances:

```ts
// field-types.ts
const _systemIdField = text().required().default(() => "");
const _systemTitleField = text().required().virtual();
const _systemTimestampField = datetime().required().default(() => new Date());
```

`AutoInsertedFields<TUserFields, TOptions, TUpload>` conditionally adds these based on collection options (timestamps, softDelete, upload).

---

## Migration from V1

### Before (V1 config-bag):
```ts
collection("posts").fields(({ f }) => ({
  title: f.text({ required: true, maxLength: 255 }),
  content: f.textarea({ localized: true }),
  views: f.number({ default: 0 }),
  author: f.relation({ to: "users", required: true }),
  tags: f.relation({ to: "tags", hasMany: true, through: "post_tags" }),
}))
```

### After (V2 immutable builder):
```ts
collection("posts").fields(({ f }) => ({
  title: f.text(255).required(),
  content: f.textarea().localized(),
  views: f.number().default(0),
  author: f.relation("users").required(),
  tags: f.relation("tags").manyToMany({ through: "post_tags" }),
}))
```

### Key API Changes

| V1 | V2 |
|---|---|
| `f.text({ required: true })` | `f.text().required()` |
| `f.text({ maxLength: 100 })` | `f.text(100)` |
| `f.text({ localized: true })` | `f.text().localized()` |
| `f.text({ default: "foo" })` | `f.text().default("foo")` |
| `f.text({ virtual: true })` | `f.text().virtual()` |
| `f.text({ input: false })` | `f.text().inputFalse()` |
| `f.text({ input: "optional" })` | `f.text().inputOptional()` |
| `f.number({ min: 0, max: 100 })` | `f.number().min(0).max(100)` |
| `f.relation({ to: "users" })` | `f.relation("users")` |
| `f.relation({ to: "tags", hasMany: true, through: "x" })` | `f.relation("tags").manyToMany({ through: "x" })` |
| `f.relation({ to: "posts", hasMany: true, foreignKey: "authorId" })` | `f.relation("posts").hasMany({ foreignKey: "authorId" })` |
| `f.select({ options: [...], multiple: true })` | `f.select([...]).multiple()` |
| `f.object({ fields: { ... } })` | `f.object({ ... })` |
| `f.array({ of: f.text() })` | `f.text().array()` |

---

## File Structure

```
packages/questpie/src/server/fields/
├── field-class.ts            Core immutable Field<TState> class
├── field-class-types.ts      FieldState, DefaultFieldState, FieldRuntimeState, type extractors
├── field-types.ts            FieldSelect, FieldWhere, AutoInsertedFields, system fields
├── types.ts                  FieldDefinition interface, FieldDefinitionState, BaseFieldConfig
├── field.ts                  V1 legacy (field(), createFieldDefinition(), BuildFieldState)
├── builder.ts                FieldBuilderProxy, FieldsCallbackContext
├── derive-schema.ts          buildZodFromState() — Zod schema from runtime state
├── index.ts                  Public barrel exports
│
├── builtin-factories/        V2 field factories
│   ├── text.ts               text(maxLength?): Field<TextFieldState>
│   ├── textarea.ts           textarea(): Field<TextareaFieldState>
│   ├── email.ts              email(): Field<EmailFieldState>
│   ├── url.ts                url(): Field<UrlFieldState>
│   ├── number.ts             number(): Field<NumberFieldState>
│   ├── boolean.ts            boolean(): Field<BooleanFieldState>
│   ├── date.ts               date(): Field<DateFieldState>
│   ├── datetime.ts           datetime(): Field<DatetimeFieldState>
│   ├── time.ts               time(): Field<TimeFieldState>
│   ├── select.ts             select(options): Field<SelectFieldState>
│   ├── upload.ts             upload(): Field<UploadFieldState>
│   ├── relation.ts           relation(target): Field<RelationFieldState>
│   ├── object.ts             object(fields): Field<ObjectFieldState>
│   ├── json.ts               json(): Field<JsonFieldState>
│   ├── from.ts               from(fieldDef): Field<...>
│   └── index.ts              Barrel with side-effect imports (prototype patches)
│
├── builtin/                  V1 legacy field implementations (being phased out)
│   ├── defaults.ts           builtinFields map (imports from builtin-factories/)
│   └── index.ts              Barrel
│
└── operators/                Operator system
    ├── types.ts              OperatorSetDefinition, OperatorMap
    ├── builtin.ts            stringOps, numericOps, booleanOps, dateOps, etc.
    ├── operator-set.ts       createOperatorSet()
    ├── resolve.ts            resolveContextualOperators()
    └── index.ts              Barrel
```

---

## Implementation Phases

### Phase 1: Core ✅
- `Field<TState>` class with immutable `_clone()` pattern
- `FieldState` + `DefaultFieldState` type accumulator
- `FieldRuntimeState` for runtime data
- `createField()` factory helper
- `ExtractSelectType`, `ExtractInputType`, `ExtractWhereType` type utilities

### Phase 2: Builtin Factories ✅
- All 15 field factories in `builtin-factories/`
- Each factory sets type, data, columnFactory, schemaFactory, operatorSet
- Chain methods via prototype patches (text: pattern/trim/lowercase/uppercase, number: min/max/positive/int/step, relation: hasMany/manyToMany/multiple/onDelete/onUpdate, date: autoNow/autoNowUpdate, select: enum, from: type)

### Phase 3: Type Selectors ✅
- `FieldSelect` with V2 dispatch via `_` phantom
- `FieldWhere` with V2 dispatch via `_` phantom
- `V2FieldSelect` reads data, notNull, output, virtual from TState
- `V2FieldWhere` reads operators.column from TState

### Phase 4: System Fields ✅
- `AutoInsertedFields` uses real V2 field instances
- System fields: id, _title, createdAt, updatedAt, deletedAt, upload fields (key, filename, mimeType, size, visibility)

### Phase 5: Collection Builder Integration ✅
- `.fields(({ f }) => ({ ... }))` accepts V2 Field instances
- `ExtractColumnsFromFieldDefinitions` extracts column types
- `builtinFields` map uses V2 factories

### Phase 6: Migration Script ✅
- Node.js script (`scripts/migrate-test-fields-v2.mjs`) for mechanical V1→V2 syntax conversion
- Handles: required, maxLength, localized, default, virtual, input, output, access, admin, hooks, min/max, pattern, relation variants, select options, object fields

### Phase 7: Test Migration ✅
- All test files converted from V1 to V2 syntax
- Fixed migration script artifacts (`(())` patterns, extra braces)
- All 1077 tests pass

### Phase 8: Codegen Verification ✅
- Codegen system is format-agnostic — no changes needed
- All 124 codegen tests pass

### Phase 9: V1 Cleanup ✅
- Deleted 15 V1 builtin field files (text, number, boolean, etc.)
- Updated barrel exports
- Build reduced from 408 to 382 files

### Phase 10: Type Inference Fix 🔧 (in progress)
- Fix V2→V1 type extraction bridge (ExtractFieldsByLocation, ExtractOutputTypes, ExtractInputTypes, ExtractColumnsFromFieldDefinitions)
- Add V2 branch to all extractors (dual dispatch via `_` phantom)
- Centralize chain method type declarations on Field class
- Fix `InferCollectionSelect` to prevent `any` contamination from `AnyPgColumn`

---

## Open Issues

1. **Type inference broken** — V2 fields don't expose types through the V1 `FieldDefinition<infer TState>` extraction pattern. All type extractors in the collection/CRUD chain need V2 branches. (Phase 10)

2. **Column types imprecise** — V2 `TState` doesn't carry exact Drizzle column types (e.g. `PgVarcharBuilder`). This means `ctx.tables.posts.title` resolves to `AnyPgColumn` instead of `PgVarchar<...>`. Follow-up improvement.

3. **V1 legacy** — `field.ts` still contains V1 helper types (`BuildFieldState`, `NarrowFieldValue`, `createFieldDefinition`) used by admin's `richText` and `blocks` fields. These can be removed once those fields migrate to V2.

4. **OpenAPI** — `generateOpenApiSpec` doesn't handle V2 Field instances (4 pre-existing test failures). Potential redesign as codegen plugin instead of runtime introspection.
