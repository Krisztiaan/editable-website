# Dependency Extraction (Derived Graph Index)

## What “dependencies” mean

A dependency is an exact relationship between immutable versions:

> **Artifact version A depends on artifact version B** if A’s source or compiled output references B.

Dependencies matter for:
- reproducible builds (exact pins)
- impact analysis (“what breaks if we change B?”)
- GC (reachability)
- targeted rebuilds (rebuild only what changed)

## Dependency sources

Dependencies can be derived from:

1. **Resolution snapshot pins**
   - if artifact version A pins `core/Button` → `v_btn_001`, then A depends on `v_btn_001`

2. **Template usage**
   - component tags and snippet fills reference component versions

3. **Script imports and callsites**
   - imports from logical IDs resolve to pinned versions
   - callsites to known data source/mutation modules can be recorded as semantic deps

## Representation

Store an indexed edge list:

```ts
type DepEdge = {
  fromVersionId: string;
  toVersionId: string;
  kind:
    | 'pin'
    | 'imports'
    | 'uses_component'
    | 'uses_layout'
    | 'calls_source'
    | 'calls_mutation'
    | 'calls_transform';
  ref?: string; // optional: source range, symbol name, etc.
};
```

Edges are derived; storing them is an optimization and an audit trail.

## Extraction process

On saving an artifact version:
1. parse the virtual `.svelte`/`.ts` sources
2. read the version’s resolution snapshot pins
3. record `pin` edges for every pinned dependency
4. optionally refine with `uses_component` / `calls_source` edges by AST inspection

On build:
- validate that every logical import has a pin
- optionally compute the dependency closure for incremental builds

## GC reachability

Define a reachable set:
- start from all pointers (prod/staging/preview/drafts)
- traverse `pin` edges (and optionally other edges)
- everything reachable is retained

## Marker grammar (Flow node IDs)

Flow node instance IDs are stored in source via markers:

`// @flow.node id=<id> [k=v ...]`

The dependency extractor may record `ref` metadata tying node instance IDs to source ranges for debugging, but node IDs are primarily for Flow UI state.

