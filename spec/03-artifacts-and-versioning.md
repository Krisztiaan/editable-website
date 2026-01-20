# Artifacts, Versions, and Pointers

## Version everything that changes

Any user-visible or build-relevant change should produce a new immutable version:
- Pages/layouts/compositions
- Theme tokens
- Tenant plugin enablement/config
- Tenant content (blog posts, navigation config, etc.) if represented as code/config

Rationale:
- time travel / rollback
- immutable assumptions for caching
- reproducible builds
- safe preview/staging/prod promotion

## The immutable version model

Each artifact has:
- a stable `artifact_id`
- many immutable `version_id`s

**Immutable means:**
- source blobs for a `version_id` never change
- compiled outputs for a `version_id` never change
- derived metadata (deps/types/contracts) may be re-derived, but should be stored keyed by `version_id` for speed

## Exact pins everywhere (per-version lockfile)

Each `artifact_version` includes a **resolution snapshot**:
- every logical dependency reference used by its source resolves to an exact pinned `version_id`
- compilation uses this snapshot to produce deterministic output

This avoids “floating dependencies” and makes rollback safe.

## Meta app / plugin code baseline

Tenant artifact versions are built against a specific deployed “meta app” release (git code + installed plugin package versions).

For Node-first MVP:
- the meta app release is deployed as a unit (normal CI/CD)
- tenant artifact versions compiled under that release are reproducible within that release

Optionally store the meta app build identifier (git sha, build number) as build metadata on `artifact_versions` for audit/debug.

## Pointers (preview/staging/prod/drafts)

Pointers are (tenant, artifact, name) → `version_id`.

Typical pointer set:
- `draft:<userId>`: personal, non-shared pointer while editing
- `preview`: shared pointer for quick review links
- `staging`: shared pointer for team review/approval
- `prod`: live pointer

**Promotion** is pointer reassignment:
- `staging = someVersion`
- `prod = staging`

**Rollback** is pointer reassignment:
- `prod = previousVersion`

## Build validity model

Artifact versions can have build statuses:
- `draft`: saved source, not built yet (or built only partially)
- `built`: compile succeeded; outputs stored
- `failed`: compile failed; outputs absent; diagnostics recorded

Pointer assignment rules (recommended):
- `prod` may only point to `built` versions
- `staging/preview` may point to `built` or (optionally) `draft` if you support “preview without compile”

## Garbage collection (GC)

Never cascade-delete versions by foreign keys. Use reachability GC:
- A `version_id` is reachable if referenced by any pointer or by any reachable version’s dependency snapshot.
- Only unreachable versions/blobs are eligible for deletion.

This preserves rollback/history while allowing cleanup.
