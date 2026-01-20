# MVP Milestones (End-to-End)

This is a suggested incremental path that yields a usable product early.

## Milestone 0 — Foundations

- DB schema for:
  - artifacts + artifact_versions
  - blobs
  - pointers
  - locks
- Minimal admin UI for:
  - creating a tenant
  - listing artifacts and pointers
  - assigning pointers (manual)

## Milestone 1 — Virtual page + compile + serve (prod pointer)

- Define a minimal virtual `Page.svelte` format with region markers.
- Build pipeline:
  - compile a page version (server module + client module + CSS)
  - store artifacts as blobs
- Runtime:
  - catch-all route resolves a single page by pointer and SSR renders it
  - client hydrator loads the client module and hydrates the region

## Milestone 2 — UI editor for structure/content

- Core component library (flex-first): Container/Stack/Row/FlexItem/Text/RichText/Image/Button + If/Each/Await.
- Live editing overlays + inspector.
- Drag/drop within snippet regions.
- Save draft creates new versions and updates `draft:<user>` pointer.
- Publish swaps `prod` pointer.

## Milestone 3 — Preview/staging + rollback

- Add `preview` and `staging` pointers.
- Add “promote” UI and “rollback” UI.
- Audit log for promotions.

## Milestone 4 — Flow viewer (derived)

- Flow extraction from `<script lang="ts">`:
  - show bindings/callsites as nodes
  - stable node ids via `// @flow.node` markers for editor-owned nodes
- Persist Flow UI positions per `(doc_id, node_id)`.

## Milestone 5 — Flow editing (owned region)

- Allow safe edits in generated region:
  - rewire args
  - edit literals
  - insert/delete owned bindings
- Integrate inspector binding picker to Flow outputs.

## Milestone 6 — Compositions and theme

- Extract subtree → tenant composition artifact.
- Theme token artifact + editor UI.

## Milestone 7 — Plugins

- Tenant plugin enablement versioning and catalog integration.
- Remote Function discovery → sources/mutations in catalog.

