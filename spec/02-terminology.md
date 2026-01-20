# Terminology

## Tenant
A single website/project instance. Tenants have their own:
- enabled plugin set
- editable artifacts (pages, compositions, theme, etc.)
- pointers (prod/staging/preview)

## Artifact
A changeable unit that can be versioned immutably. Examples:
- page
- layout
- composition (editor-authored reusable component)
- theme
- plugin configuration
- data source definition (when tenant-configured)
- mutation definition (when tenant-configured)

Artifacts have a stable `artifact_id` and many immutable `artifact_version`s.

## Artifact version
An immutable snapshot of an artifact at a point in time, identified by `version_id`.
Contains:
- source blobs (virtual `.svelte` / `.ts` / JSON config)
- derived metadata (type/contract snapshots, dependency edges)
- compiled build outputs (server + client modules, CSS) if build succeeded
- an exact dependency **resolution snapshot**

## Pointer
A named reference that points to a specific `version_id`. Pointers are tenant-scoped and artifact-scoped.
Examples:
- `prod`
- `staging`
- `preview`
- `draft:<userId>`

## Catalog
The discoverability layer: the set of available artifact versions to choose from (core + plugins + tenant artifacts).

## Resolution snapshot (exact pins)
A per-artifact-version mapping of **logical references** (e.g. `core/Button`) to **exact pinned versions** (`version_id`s).
Acts like a per-version lockfile.

## Component contract
The shape of a component as used by the editor:
- props (name, type, required/optional, UI control hints)
- snippet props (named regions/children; required/optional; typed parameters for snippet callbacks)
- placement rules (what containers/slots it can be dropped into)

## Data source / Mutation / Transform

- **Data source**: produces typed values for rendering (`query`, “get current user”, “get weather”).
- **Mutation**: triggers side effects (`command`, “submit form”, “track analytics event”).
- **Transform**: pure computation on values (formatting, mapping, joining).

In the Flow view, all of these are just *nodes with typed ports*; optional tags help classify them.

## Virtual file
Source stored in the database, treated as canonical code. Examples:
- `Page.svelte` (virtual)
- `Theme.ts` (virtual)

Virtual files are built into compiled server/client modules at publish/build time.

