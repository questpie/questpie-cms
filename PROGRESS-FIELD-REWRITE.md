# Field System Rewrite — Progress Log

## Phase 1: Operator System Refactor (non-breaking)
**Status**: In Progress
**Started**: 2026-03-03

### Goals
- Introduce `OperatorSet` concept with auto-derived JSONB ops
- Create `operators/` directory with types, factory, resolver, builtins
- Deprecate `common-operators.ts`, re-export from new module
- Update builtin fields to use `operatorSet()` internally
- Fix where-builder to use field-driven operator dispatch

### Changes
- [ ] `operators/types.ts` — `OperatorSetDefinition`, `JsonbCast` type
- [ ] `operators/operator-set.ts` — `operatorSet()`, `extendOperatorSet()` factories
- [ ] `operators/resolve.ts` — `resolveContextualOperators()`, `deriveJsonbOperator()`, `buildJsonbRef()`
- [ ] `operators/builtin.ts` — All builtin operator sets
- [ ] `operators/index.ts` — Barrel
- [ ] Update `common-operators.ts` — Deprecate, re-export
- [ ] Update builtin fields — Use new operator sets internally
- [ ] Update where-builder — Field-driven dispatch

---

## Phase 2: Core Field Builder Class
**Status**: Pending

---

## Phase 3: Builtin Field Factories
**Status**: Pending

---

## Phase 4: Relation + Upload Fields
**Status**: Pending

---

## Phase 5: Collection Builder Integration
**Status**: Pending

---

## Phase 6: Admin Integration via Codegen Plugin
**Status**: Pending

---

## Phase 7: Example + Consumer Migration
**Status**: Pending

---

## Phase 8: Codegen Updates
**Status**: Pending

---

## Phase 9: Cleanup + Test Migration
**Status**: Pending
