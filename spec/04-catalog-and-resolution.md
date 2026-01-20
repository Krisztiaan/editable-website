# Catalog and Resolution (Exact Pins)

## Why a catalog exists

The editor needs to list what can be inserted/used:
- components (core + plugins + tenant compositions)
- data sources / mutations / transforms
- layouts

The catalog is a **discoverability layer**. It is not the source of truth (code is).

## Logical IDs vs pinned versions

We keep sources readable by using **logical IDs** at authoring time:
- `core/Button`
- `plugin:shopify/ProductGrid`
- `tenant:acme/Composition/HeroV2`

At build time, these logical references are resolved using the artifact version’s **resolution snapshot**:
- `core/Button` → `version_id: v_btn_001`

## Resolution snapshots (“lockfiles”)

Each artifact version stores a mapping:

```ts
type LogicalId = string; // e.g. "core/Button"
type VersionId = string; // opaque, immutable

type ResolutionSnapshot = {
  // Exact pins for dependencies referenced by this artifact version
  pins: Record<LogicalId, VersionId>;

  // Optional metadata for tooling/debug:
  generatedAt: string;
  generatedBy: string; // user/system
};
```

Snapshots are created/updated when:
- inserting a component/source/mutation (the editor picks a version)
- upgrading a dependency (pins are changed intentionally)
- cloning a version (snapshot copied)

Because artifact versions are immutable, “updating” a snapshot always means creating a **new artifact version** with a new snapshot.

## Import resolution during build

Build uses a resolver that:
1. reads the `ResolutionSnapshot` for the artifact version being built
2. maps logical imports to pinned versions
3. fetches the pinned versions’ virtual sources from the database
4. provides those sources to the bundler/compiler as virtual modules

This can be implemented via:
- a Vite plugin `resolveId/load` pair
- or a custom module loader if you compile without Vite

### Logical import conventions (recommended)

To keep sources readable and to make resolution deterministic, generated code should import using a single namespace:

- Components/layouts/compositions:
  - `import Button from '@catalog/core/Button'`
  - `import ProductGrid from '@catalog/plugin:shopify/ProductGrid'`
  - `import HeroV2 from '@catalog/tenant:acme/Composition/HeroV2'`

- Data sources/mutations/transforms:
  - `import { getPosts } from '@catalog/core/data/getPosts'`

The resolver uses the current artifact version’s snapshot pins to map these logical IDs to pinned `version_id`s and returns virtual module bytes accordingly.

## Catalog contents and scoping

Catalog entries are derived from:
- core “built-in” registry (in repo)
- enabled plugins for the tenant
- tenant-authored compositions/components

Each entry includes:
- logicalId
- available versions (with semver/tags if present)
- “latest” convenience pointer for insertion (not for runtime resolution)

## Upgrades and breaking changes

All runtime pins are exact. Semver is informational:
- show upgrade availability in UI
- warn on major changes
- require explicit pin changes for upgrades

Upgrades are performed by:
- creating a new artifact version whose snapshot pins new dependency versions
- rebuilding and validating
- promoting pointers if successful
