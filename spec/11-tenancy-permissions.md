# Tenancy and Permissions

## Tenancy model

Everything is tenant-scoped:
- artifact identities and versions
- pointers
- enabled plugin set and plugin config
- users/roles

Tenants never share mutable state; shared code exists only in git/plugin packages.

## Roles (suggested)

- **Viewer**: can view site and preview links
- **Editor**: can edit pages/compositions in draft; cannot publish to prod
- **Publisher**: can promote pointers to staging/prod
- **Admin**: can manage users, enable plugins, take over locks, manage domains
- **Developer**: can author git/plugin code (outside the app); may have additional in-app permissions for advanced tools

## Permissions

Permissions gate:
- entering edit mode for an artifact
- changing layout structure vs only content (optional split)
- editing theme
- editing Flow logic (rewiring/insertion in generated region)
- promoting pointers (preview/staging/prod)
- enabling plugins

## Locking (MVP)

Document-level locks:
- `(tenant_id, artifact_id)` leased to a user
- required for any write to that artifact’s draft pointers

Admins can take over locks; all takeovers are audited.

## Plugin enablement

Enabling/disabling a plugin is a versioned artifact/config:
- changing plugin enablement creates a new config version
- pointers determine which config is active in prod/staging/preview

Plugins contribute to:
- catalog entries (components, node types)
- build context (virtual resolver can access plugin sources)

## Safety boundary

Non-dev editors:
- never directly edit `<script>` code
- only modify UI-owned template structures and generated bindings via safe UI

Developers:
- can ship plugins/components that are fully capable (they are code)
- are responsible for code review/security of plugins

