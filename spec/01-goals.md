# Goals / Non-goals

## Primary goals

1. **Live site editing**
   - Editors (marketers, content people) edit the *actual* site while viewing it.
   - Editing UI is overlays + inspector + drag/drop; not a separate “admin CMS”.

2. **Svelte-native composition**
   - Layouts/pages/components follow Svelte 5 idioms (snippet props + `{@render ...}`).
   - Content and structure are represented as Svelte components (no bespoke templating language).

3. **Immutable versioning + time travel**
   - Every change creates a new immutable version.
   - Environments (preview/staging/prod) are pointers to versions.
   - Rollback is a pointer swap.

4. **Exact pins / reproducibility**
   - Every artifact version pins exact versions of its dependencies (per-version lockfile).
   - A build of version X is reproducible even years later.

5. **Flow view of logic**
   - Any TypeScript function/callsite can be represented as a node in a Flow graph.
   - The Flow graph is derived from AST + TypeScript types; it can be used to **visualize** and **edit** designated regions.

6. **Plugin-ready**
   - Developers can add components/data sources/mutations/transforms as “plugins”.
   - Tenants enable plugins; enabled plugins contribute to the catalog.

## Non-goals (for MVP)

- **No freeform canvas page layout** (absolute positioning / arbitrary dragging). Layout is constrained to flex/grid primitives.
- **No multi-user real-time coediting**. MVP uses document-level locking; collaboration comes via preview/staging pointers and review workflows.
- **No serverless/edge runtime requirements**. Optimize for Node runtime first; edge/serverless can be targeted after PMF.
- **No arbitrary code execution by non-dev editors**. Editors do not write `<script>` code; script is generated.

## Constraints / assumptions

- **Svelte 5** is required (runes/snippets/`{@render}`).
- Build and type derivations use TypeScript (`tsc` or Language Service).
- Artifact sources live in the database as “virtual files”. Git contains the “meta app” and developer-authored plugins.

