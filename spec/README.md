# Spec: Editable Svelte “CMS‑less” Site Builder

This directory contains the product/engineering specification for a **Svelte 5 / SvelteKit**-native website builder with a **live “edit this site” UI**, a **code-canonical storage model**, and an **AST/type-driven flow view** for data/mutation logic.

## Guiding principles

- **Code is the source of truth.** Editable artifacts are stored as Svelte/TypeScript sources (“virtual files” in the database).
- **Everything changeable is versioned immutably.** All edits create new immutable versions; environments are **pointers** to versions.
- **Exact pins everywhere.** Each artifact version carries an exact dependency snapshot (a per-version “lockfile”).
- **Derived, not duplicated.** Contracts/types are derived from TypeScript (`tsc`/Language Service). Dependency graphs and flow graphs are derived from AST + types. UI state (positions, selection) is stored separately.
- **Editor-first, not code-first.** Non-dev editors work via live on-page decorations, drag/drop, and an inspector. Code editing (if ever) is later and role-gated.
- **Svelte 5 mental model.** Snippet props + `{@render ...}` are the slotting model; runes are the reactivity model.

## Documents

1. `spec/01-goals.md` — goals, non-goals, constraints.
2. `spec/02-terminology.md` — shared vocabulary.
3. `spec/03-artifacts-and-versioning.md` — immutable versions, pointers, environments, time travel.
4. `spec/04-catalog-and-resolution.md` — catalog, exact pins, resolution snapshots, import resolution.
5. `spec/05-virtual-svelte-format.md` — virtual `.svelte` file format and generated regions.
6. `spec/06-ui-editor.md` — live page editor (selection, inspector, DnD, snippets/slots, theme).
7. `spec/07-flow-editor.md` — AST/type-driven Flow view/editor and stable node IDs.
8. `spec/08-contracts-and-types.md` — deriving contracts/types; optional metadata for UX.
9. `spec/09-dependency-extraction.md` — what “deps” mean, how extracted, how used.
10. `spec/10-build-and-runtime.md` — compile/build pipeline, module loading, preview/staging/prod pointers.
11. `spec/11-tenancy-permissions.md` — tenants, roles, locks, plugin enablement.
12. `spec/12-mvp-milestones.md` — a minimal path to an end-to-end MVP.
13. `spec/13-data-model.md` — proposed DB schema and key entities.
14. `spec/14-contract-compatibility.md` — contract extraction, breaking changes, upgrade mechanics.
