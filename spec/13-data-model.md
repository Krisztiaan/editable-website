# Data Model (Proposed DB Schema)

This is a proposed schema for a Node-first MVP using SQLite (or Postgres later). It is intentionally normalized around:
- immutable artifact versions
- blob storage
- pointers
- locks
- derived indices (deps, contract snapshots, flow UI layout)

This schema is a *starting point*; implementation can evolve, but the core invariants should remain:
- versions immutable
- pointers mutable
- derived indices rebuildable

## Core tables

### `tenants`

```sql
CREATE TABLE tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### `users` and `user_roles`

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, email)
);

CREATE TABLE user_roles (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- viewer|editor|publisher|admin|developer
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id, role)
);
```

### `blobs`

Immutable bytes referenced by content hash.

```sql
CREATE TABLE blobs (
  blob_id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  data BLOB NOT NULL,
  UNIQUE(sha256)
);
```

### `artifacts`

Logical identity.

```sql
CREATE TABLE artifacts (
  artifact_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- page|layout|component|composition|theme|route_map|plugin_config|...
  logical_id TEXT NOT NULL, -- e.g. "tenant:acme/page/home"
  title TEXT NOT NULL,
  origin TEXT NOT NULL, -- core|plugin:<id>|tenant
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, logical_id)
);
```

### `artifact_versions`

Immutable versions, each can contain multiple files and multiple build outputs.

```sql
CREATE TABLE artifact_versions (
  version_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL, -- draft|built|failed|released
  source_hash TEXT NOT NULL, -- hash of file blobs + pins (determinism)
  resolution_snapshot_blob_id TEXT NOT NULL, -- JSON pins (lockfile)
  diagnostics_blob_id TEXT DEFAULT NULL, -- JSON for build errors/warnings
  FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id)
);

CREATE INDEX artifact_versions_by_artifact ON artifact_versions(artifact_id, created_at);
```

### `artifact_version_files`

Maps virtual file paths to source blobs (canonical code).

```sql
CREATE TABLE artifact_version_files (
  version_id TEXT NOT NULL,
  path TEXT NOT NULL,            -- e.g. "Page.svelte", "logic.ts"
  blob_id TEXT NOT NULL,         -- source bytes
  kind TEXT NOT NULL,            -- source|generated|config
  PRIMARY KEY (version_id, path),
  FOREIGN KEY (version_id) REFERENCES artifact_versions(version_id),
  FOREIGN KEY (blob_id) REFERENCES blobs(blob_id)
);
```

### `artifact_build_outputs`

Stores compiled outputs for SSR + client + CSS.

```sql
CREATE TABLE artifact_build_outputs (
  version_id TEXT NOT NULL,
  target TEXT NOT NULL,          -- server|client|css|manifest
  path TEXT NOT NULL,            -- logical output name (e.g. "entry.mjs")
  blob_id TEXT NOT NULL,
  PRIMARY KEY (version_id, target, path),
  FOREIGN KEY (version_id) REFERENCES artifact_versions(version_id),
  FOREIGN KEY (blob_id) REFERENCES blobs(blob_id)
);
```

### `pointers`

Mutable labels to versions. Note pointers are **per artifact**.

```sql
CREATE TABLE pointers (
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  pointer TEXT NOT NULL,         -- prod|staging|preview|draft:<userId>
  version_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, artifact_id, pointer),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id),
  FOREIGN KEY (version_id) REFERENCES artifact_versions(version_id)
);
```

### `locks`

Lease-based document locks (MVP).

```sql
CREATE TABLE locks (
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  locked_by TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, artifact_id),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id)
);
```

## Derived indices

### `artifact_deps`

Derived dependency edges between immutable versions.

```sql
CREATE TABLE artifact_deps (
  from_version_id TEXT NOT NULL,
  to_version_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT DEFAULT NULL,
  PRIMARY KEY (from_version_id, to_version_id, kind, ref),
  FOREIGN KEY (from_version_id) REFERENCES artifact_versions(version_id),
  FOREIGN KEY (to_version_id) REFERENCES artifact_versions(version_id)
);
```

### `contract_snapshots`

Optional JSON snapshots of extracted contracts/types to speed up UI.

```sql
CREATE TABLE contract_snapshots (
  version_id TEXT NOT NULL,
  kind TEXT NOT NULL,     -- component|function|datasource|mutation|...
  blob_id TEXT NOT NULL,  -- JSON
  PRIMARY KEY (version_id, kind),
  FOREIGN KEY (version_id) REFERENCES artifact_versions(version_id),
  FOREIGN KEY (blob_id) REFERENCES blobs(blob_id)
);
```

### Flow UI state (sidecar)

Graph semantics are derived; persist only layout state.

```sql
CREATE TABLE flow_doc_ui (
  tenant_id TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  viewport_x REAL NOT NULL,
  viewport_y REAL NOT NULL,
  zoom REAL NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, doc_id)
);

CREATE TABLE flow_node_ui (
  tenant_id TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  node_id TEXT NOT NULL, -- @flow.node id=...
  x REAL NOT NULL,
  y REAL NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT NULL,
  group_id TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, doc_id, node_id)
);
```

## Route map and plugin enablement

Route map and plugin enablement are themselves artifacts:
- `kind = route_map` with a config file (`routes.json`) stored in `artifact_version_files`
- `kind = plugin_config` with a config file (`plugins.json`)

Pointers select which map/config is active in prod/staging/preview.

## Audit log (recommended)

Record pointer moves, lock takeovers, publishes, plugin enablement changes.

```sql
CREATE TABLE audit_log (
  tenant_id TEXT NOT NULL,
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_blob_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payload_blob_id) REFERENCES blobs(blob_id)
);
```

