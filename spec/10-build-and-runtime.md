# Build and Runtime

## Overview

We target an idiomatic, performant model:
- virtual sources are canonical
- builds produce immutable compiled artifacts (server + client)
- environments are pointers to versions
- runtime loads compiled artifacts by version id and renders them

This section describes a Node-first implementation. Edge/serverless concerns can be layered later.

## Build inputs

For a given `artifact_version`:
- virtual sources (e.g. `Page.svelte`, helper `.ts` files)
- its `ResolutionSnapshot` (exact pins)
- tenant plugin enablement/config versions (also pinned)
 - the meta app release version (git/plugin code baseline)

## Build outputs

For a buildable UI artifact (page/layout/composition):
- **server module** (SSR-capable)
- **client module** (hydration-capable)
- **CSS** (as extracted CSS file or inlined)
- **diagnostics** (tsc + Svelte compile errors)

Outputs are stored as immutable blobs keyed by `version_id` + content hash.

## Build pipeline (recommended)

### Step 1: typecheck
- Run `tsc` (or TS service) for the build context.
- Produce diagnostics; fail build if type errors exist in the owned/generated regions or pinned deps.

### Step 2: bundle/compile with a virtual module resolver

Use a bundler (Vite recommended) with:
- a resolver that maps logical IDs to pinned versions via `ResolutionSnapshot`
- a loader that serves virtual module bytes from the database

Produce:
- SSR ESM module for the artifact entry
- browser ESM module for hydration
 - optional `manifest.json` (CSS/import metadata) for runtime convenience

### Step 3: store outputs and mark version built
- store server/client/CSS blobs
- store build metadata (hashes, timestamps, tool versions)
- mark `artifact_version.status = built`

## Runtime architecture (SvelteKit meta app)

The meta app is a normal SvelteKit app that:
- authenticates users and enforces roles
- serves the editor UI
- resolves tenant route mappings
- loads and renders compiled artifact versions

### Routing (“DB-backed shadow SvelteKit”)

Use a catch-all route for the editable site:
- resolve `path` via tenant route map (stored as versioned artifact/config)
- choose pointer (`prod`/`staging`/`preview`) based on request context
- load the corresponding page `version_id`

The route map itself is versioned and pointer-controlled, just like pages.

## Loading compiled modules by version

Node runtime needs to load:
- server module (for SSR)
- client module (for hydration in browser)

Recommended approach:
- serve client module bytes at a stable URL:
  - `/__artifacts/<versionId>/client.mjs`
  - `/__artifacts/<versionId>/style.css`
  - `/__artifacts/<versionId>/manifest.json` (optional)
- server loads the server module from:
  - an on-disk immutable cache keyed by content hash, then `import()`
  - or a `vm.SourceTextModule` strategy (Node-only)

Because versions are immutable, aggressive caching is safe.

### Cache headers (recommended)

Because `versionId` is immutable, artifact endpoints should be long-cacheable:
- `Cache-Control: public, max-age=31536000, immutable`
- ETag based on blob hash

Never serve “latest” artifacts without a versionId in the URL; use pointers only at the HTML routing level.

### Atomicity

Publishing is pointer reassignment:
- build version → if success, update pointer in a single DB transaction
- runtime always resolves pointers first, then serves immutable artifacts by id

This prevents partial deployments and makes rollback constant-time.

## SSR + hydration model (dynamic islands)

Since the dynamic page component is not part of the meta app’s build-time client bundle:
- the meta app SSR renders the page component using the server module
- the meta app client hydrates itself normally, then dynamically imports the client module and hydrates the page region

Mechanism:
1. SSR: render `<div data-artifact-root>` containing the page HTML.
2. Client: on mount, `import(/* @vite-ignore */ clientUrl)` and instantiate component with `hydrate: true`.

CSS:
- SSR injects a `<link>` or `<style>` for the page version’s CSS.
- Client ensures CSS is loaded before hydration (or tolerates FOUC).

## Preview/staging/prod selection

Pointers are selected by request context:
- prod: default
- staging/preview: by cookie, query param, or separate hostname
- drafts: by session for authenticated editors

Selection should be explicit and auditable in logs.

## Rollback and time travel

Rollback is pointer reassignment:
- `prod = oldVersionId`

Because builds are immutable and pinned, rollback is immediate and safe.
