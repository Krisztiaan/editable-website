# Flow Editor (AST/Type-Driven Data & Mutation Graph)

## Purpose

The Flow editor is a separate UI surface for visualizing and editing the **logic layer**:
- data sources (reads)
- transforms (pure computations)
- mutations/effects (writes)

The Flow graph is **derived from canonical TypeScript/Svelte code** using AST + TypeScript types.

Svelte Flow (`@xyflow/svelte`) can be used as the canvas UI. The graph semantics remain owned by this project.

## Inputs to Flowification

Flowification runs on:
- `<script lang="ts">` of virtual `.svelte` artifacts
- referenced `$lib/**` modules
- enabled plugin modules

The TypeScript Language Service is used to:
- resolve symbols and signatures
- instantiate generics at call sites
- compute assignability for connections

## Graph scope and navigation (“go inside”)

Graph scope is identified by `doc_id` (see `spec/09-dependency-extraction.md` and `spec/10-build-and-runtime.md`):
- file/page scope (default)
- function scope (when double-clicking into a node)

Double-click navigation:
- local function/method → open subgraph for its body
- external dependency (node_modules/unindexed) → show a black box with signature/docs

## Node identity (stable layout)

### Node instances
Flow nodes are primarily **node instances** anchored to statements/callsites.

Stable identity is achieved via a marker comment:

```ts
// @flow.node id=posts kind=source runtime=server
const posts = getPosts({ tag });
```

The Flow UI stores only node position/state keyed by:
- `(tenant_id, doc_id, node_instance_id)`

If no marker exists, a best-effort derived id can be used, but layout stability is not guaranteed until pinned.

### Marker grammar (authoritative)

Canonical marker:

`// @flow.node id=<id> [k=v ...]`

Rules:
- marker must be a single-line comment
- it attaches to the **next statement** (leading comment) or the **previous statement** (trailing comment)
- `id` is required and unique within a `doc_id`
- `<id>`: `[A-Za-z][A-Za-z0-9_-]{0,63}`
- unknown keys are ignored for forward compatibility

Recommended keys:
- `id=<id>` (required)
- `name="Display name"` (optional; overrides inferred label)
- `kind=source|transform|mutation|effect|unknown` (optional)
- `runtime=server|client|shared` (optional)
- `group=<id>` (optional)
- `pin=true` (optional; indicates “stable, don’t auto-regenerate”)

Example:

```ts
// @flow.node id=posts name="Get posts" kind=source runtime=server
const posts = getPosts({ tag });
```

## Node types (automatic, “any function is a node”)

### Call nodes
For `const out = f(a, b)` or `out = obj.method(a)`:
- Node type = resolved TS signature of `f`/`method` at the call site
- Input ports = parameters (instantiated generics)
- Output port = return type
- Methods have an implicit `this` port (represented explicitly in the graph)

### New nodes
For `const out = new C(a)`:
- Node type = constructor signature
- Output type = instance type

### Expression nodes (fallback)
For `const out = f(a) + g(b)` or complex expressions:
- Node type = expression (opaque-ish)
- Inputs = referenced symbols
- Output type = expression type

The UI can offer “extract to node” / “explode” actions to split complex expressions into multiple bindings.

### Runes as boundaries
Svelte 5 runes are treated as first-class nodes:
- `let x = $derived(expr)` → derived node producing `x`
- `$effect(() => { ... })` → effect node (mutation/effect boundary)

## Palette (“reachable-first”)

Default palette shows:
- node types reachable from the current scope (in-file declarations + current imports)
- plus node instances present in the graph

Omnibox:
- global search over the indexed TypeScript program (project + enabled plugins + deps with types)
- inserting a node via omnibox adds an import (in an editor-owned region) and inserts a statement in the generated region

## Connections and type fit

Edges represent typed value flow:
- output port type must be assignable to input port type (TypeScript assignability)

If output is `Promise<T>` and input is `T[]`, the UI should suggest inserting an `Await`/unwrap pattern (either in template via `{#await}` or in logic via helper functions).

## Editing semantics (AST codemods)

Flow is not a second source of truth. Editing the Flow graph applies AST transforms to code.

### Safe edits (MVP)
- rewire an argument: rewrite the corresponding argument expression
- edit literal/object literal arguments via inspector
- insert a new binding statement in the generated region:
  - `const x = someFn(...)`
- delete an editor-owned binding statement (and optionally fix downstream references)
- rename an editor-owned binding (and update references)

### Read-only by default outside generated regions
Dev-authored code outside editor-owned regions is:
- fully flowified (visualized)
- not rewritten by non-dev tooling

Dev roles may opt-in to rewriting via explicit pin/ownership markers.

## Persisted UI state (sidecar)

Persist only diagram UI state:
- node positions, collapsed state, colors/groups
- viewport (pan/zoom)

Never persist the derived graph semantics; re-derive from code on load.

Reference schema: see `spec/13-data-model.md` (`flow_doc_ui`, `flow_node_ui`).

## Relationship to UI editor

The UI editor binds component props to “bindings” (variables) produced by script logic.

Flow provides:
- a visualization of how those bindings are produced
- a way to modify binding logic safely (in owned regions)
- “jump to producer” and “highlight consumers” features for debugging
