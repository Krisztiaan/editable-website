# Contract Compatibility and Breaking Changes

## Why compatibility checks are needed

With exact pins and immutable versions, most safety comes “for free”, but you still need:
- confidence that a version *builds* (typecheck + compile)
- confidence that upgrading pins won’t break consumers
- useful UI warnings about breaking changes

## Source of truth: TypeScript

Contracts are derived from TypeScript:
- function signatures for Flow nodes
- component props/snippet expectations (via TS + optional editor contract exports)
- remote function query/command signatures

The goal is “single source of truth”:
- types from TS
- optional metadata improves UX but does not override types

## What is a “breaking change”

Breaking change rules depend on artifact kind.

### Components
Breaking changes include:
- removing a prop
- changing a prop type to something non-assignable for previous callers
- changing requiredness (optional → required)
- removing/renaming a snippet prop region
- changing snippet parameter types (e.g. `item: Post` → `item: Article` non-assignable)

Non-breaking (generally):
- adding an optional prop
- widening a type (e.g. `string` → `string | null`)

### Functions (Flow nodes)
Breaking changes include:
- removing/renaming a parameter
- changing param type non-assignably
- changing return type non-assignably for known consumers

### Data sources / mutations
Breaking changes include:
- input schema changes incompatible with existing calls
- output type changes incompatible with consumers
- runtime changes (shared → server-only) if used on client

## How to compute compatibility

Two layers:

1. **Build-time correctness**
   - `tsc` + Svelte compile must succeed for the artifact version’s pinned closure.

2. **Upgrade-time analysis (optional but recommended)**
   - when proposing an upgrade (changing a pin), compute:
     - impacted dependents (via `artifact_deps` reverse edges)
     - typecheck those dependents against the upgraded version

Because everything is pinned, “compatibility” is measured by whether a dependent can be rebuilt with the new pin.

## Suggested implementation approach

### Contract snapshots (derived)
Store a JSON snapshot per version for UI speed:
- `contract_snapshots(version_id, kind)` points to a JSON blob.

Snapshots can include:
- normalized function signature representation (ports)
- normalized component contract (props/snippets)

Snapshots are derived and can be regenerated.

### Diffing for warnings
To surface “breaking change” warnings:
- compare old snapshot vs new snapshot
- apply heuristic rules (prop removed, requiredness flip, etc.)

This is a UX tool, not a gate.

### The real gate is rebuilding
The actual correctness gate is always:
- can the dependent artifact version rebuild (typecheck + compile) with the new pin?

## Upgrade workflow (exact pins)

1. User selects an upgrade (e.g. component `core/Button` → new version).
2. System creates a new artifact version with an updated `ResolutionSnapshot`.
3. Build runs:
   - if build succeeds, version is `built`
   - if build fails, diagnostics are attached; pointers do not move
4. Promote pointer (staging/prod) to the new built version.

Rollback is pointer reassignment to the previous built version.

