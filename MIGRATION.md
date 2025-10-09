Svelte 5 + SvelteKit 2 Upgrade Notes

Overview
- Project is migrated to Svelte 5 (runes) and SvelteKit v2 on branch `svelte5-upgrade`.
- DOM events use `onclick`, `onchange`, etc. Component events use callback props (no `createEventDispatcher`).
- Slots are replaced with snippets + `{@render ...}`. Components accept a `children` snippet.
- `$app/state` is used where applicable (stores from `$app/stores` are deprecated in SK 2.12+).
- Database schema initializes automatically on first run (reads `sql/schema.sql`).

Key runes patterns
- Props: `let { foo, bar } = $props()`; mark two‑way props with `$bindable()`.
- State: `let todos = $state([])` creates a deeply reactive proxy for arrays/objects.
- Derived: `let total = $derived(a + b)`; Effects: `$effect(() => { /* side effects */ })`.
- Snippets: `{#snippet header()}{/snippet}` then `{@render header()}`.

Bindings and arrays
- Use per‑index binding when editing items in an array: `{#each list as _, i} <Item bind:record={list[i]} /> {/each}`.
- When reordering with `splice`/`push`, Svelte’s deep reactivity updates the UI. We snapshot proxies before JSON/POSTing: `payload = $state.snapshot(state)`.

Event changes
- Elements: `onclick={handler}` (no `on:`). Window/document keep `on:` inside `<svelte:window>` / `<svelte:document>`.
- Components: accept callback props (`<Child save={() => ...} />`) instead of dispatchers.

Snippets instead of slots
- Replace `<slot>` with `{@render children?.()}` and pass additional sections as snippet props.

App state
- Prefer `$app/state` (`import { page } from '$app/state'`) over `$app/stores`.

Environment & DB
- `.env` requires `ADMIN_PASSWORD` and `DB_PATH` (e.g. `./data/db.sqlite3`).
- On first run, the app will create tables if missing.

Common migrations applied here
- `export let` → `$props()` destructuring.
- `$:` → `$derived` / `$effect` as appropriate.
- `on:` → element event attributes; component events → callback props.
- `<slot>` → `children` snippet; slot usages → snippet props.

Local dev checklist
1) `cp .env.example .env` and set `ADMIN_PASSWORD`, `DB_PATH`.
2) `npm install`
3) `npm run dev` and open `/login`, enter `ADMIN_PASSWORD`.
4) Edit homepage, Save, refresh; data persists in SQLite under `DB_PATH`.

Build & deploy
- Build: `npm run build` (Adapter Node). Preview: `npm run preview`.
- Docker build uses Fly.io secrets for `DB_PATH`, `ADMIN_PASSWORD`, `ORIGIN`.

Notes on Sets/Maps
- Arrays/objects via `$state` are deep‑reactive. For Set/Map, prefer `SvelteSet`/`SvelteMap` from `svelte/reactivity` when the semantics match.

Observability & Remote Functions
- Experimental server tracing and instrumentation entry are enabled in `svelte.config.js` (`kit.experimental.tracing.server` and `kit.experimental.instrumentation.server`). The NodeSDK boots from `src/instrumentation.server.js`.
- `kit.experimental.remoteFunctions` is enabled with `compilerOptions.experimental.async`. Future work can migrate selected `/api/*` endpoints to `query`/`form`/`command` remote functions for type‑safe calls and single‑flight updates.
