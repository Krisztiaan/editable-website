# Virtual `.svelte` Format (Canonical Source)

## Overview

Pages, layouts, and compositions are stored as **virtual `.svelte` files** in the database.

They must remain:
- readable for developers
- safe for editor-driven rewrites (AST codemods)
- structured into ownership regions (generated vs developer vs UI-owned template)

## Ownership regions

Inside `<script lang="ts">`, we split into regions:

- **Generated region** (system-owned)
  - imports for selected components/data sources/mutations
  - generated bindings / callsites created via UI actions
  - safe to rewrite by codemods

- **Developer region** (dev-owned)
  - optional manual logic; flowified but not rewritten by editor tools by default

Template region:
- **UI-owned template** (editor-owned)
  - structural component tree, snippet fills, and control flow tags
  - edited via UI (DnD/inspector), not as raw text for non-dev users

## Region markers

Use stable comments to delimit generated regions:

```svelte
<script lang="ts">
  // @editor:script:begin generated
  // (owned by system; rewritten by codemods)
  // @editor:script:end generated

  // @editor:script:begin dev
  // (owned by developers; read-only for editor tooling by default)
  // @editor:script:end dev
</script>

<!-- @editor:template:begin -->
<!-- (owned by editor; manipulated structurally) -->
<!-- @editor:template:end -->
```

Generated imports should use the logical `@catalog/...` namespace (see `spec/04-catalog-and-resolution.md`) so that build resolution is consistent and snapshot-pinned.

## Stable node instance markers (Flow)

To persist Flow node positions and to stabilize node identity across refactors,
Flow-capable bindings/callsites can be annotated:

```ts
// @flow.node id=posts kind=source runtime=server
const posts = getPosts({ tag });
```

See `spec/07-flow-editor.md` for the full marker grammar and persistence model.

## Snippet props and `{@render}`

Svelte 5 snippet props (including `children`) are first-class:
- required snippet props must show drop zones when empty
- optional snippet props can be left empty

Components render snippet props using `{@render ...}`; the editor maps snippet props to droppable regions.

## Serialization guarantees

Non-dev editors must not produce arbitrary code. Therefore:
- **Generated script** is always emitted by the system (never edited directly).
- **UI-owned template** is emitted by the system based on structural edits.

Developer-authored code may exist in the dev region and is flowified but not rewritten unless a dev opts in.
