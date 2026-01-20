# Live UI Editor (On-Page Builder)

## Purpose

The UI editor is the primary authoring interface for non-developers:
- edit the *actual published site*
- select elements to edit props/content
- drag/drop structure and snippet fills
- no direct code editing

The UI editor edits canonical **virtual `.svelte`** sources by applying **AST codemods** to the UI-owned template region and regenerating the generated `<script>` region when needed.

## Editor modes

### View mode
- normal site browsing
- no overlays, no drop zones

### Edit mode
- overlays around editable components/regions
- inspector panel showing the selected element’s contract
- component library palette for insertion
- save/publish controls

Edit mode is controlled by an app-wide editor state (context/store) similar in spirit to the current repo’s `editing` context.

## Document locking (MVP)

MVP uses **document-level locking** (no concurrent editing):

- When a user enters edit mode for a page/composition:
  - acquire lock: `(tenant_id, artifact_id)` → `locked_by`, `locked_until`
  - renew lock heartbeat while editor is open
- Save/publish requires lock ownership.
- Admins can “take over” a lock.

Locks are time-bounded leases; stale locks expire automatically.

## Selection model

- `hovered`: element under cursor (for outlines)
- `selected`: current element targeted by inspector
- `selectedRegion`: optional sub-region (e.g. a specific snippet prop region)

Selection is implemented by editor scaffolding wrappers that annotate DOM with stable `data-editor-*` attributes referencing the underlying AST node (template node id or source range).

## Component library and insertion

The component library is derived from the tenant’s catalog and includes:
- core components (layout/content primitives)
- enabled plugin components
- tenant compositions
- meta blocks (`If/Each/Await`) as “structural components”

Insertion UX:
- drag from library onto a drop zone
- click-to-insert into the currently selected container/region

The editor determines legal insertion targets using the selected component’s **contract placement rules** and the target region’s `allowedChildren` constraints.

## Snippets / regions (Svelte 5 slots)

Svelte 5 snippet props (including `children`) are the slotting model.

In the editor, each snippet prop corresponds to a **region**:
- regions can be empty (optional) or required
- required empty regions render a drop zone placeholder

### Placeholder / filler behavior

If a required region is empty, render a filler component (editor-only) that:
- visually indicates “Drop here”
- shows requiredness and expected child types (if constrained)
- becomes the drop target

If a region is non-empty and another component is dropped onto it:
- default action is **insert** at nearest boundary (before/after)
- optionally support **replace** with a modifier key (or via context menu)

## Drag & drop (Notion-like, constrained)

MVP supports structured reordering and nesting:
- reorder among siblings within a region
- move a subtree to another region (reparent)
- duplicate, delete, wrap in container primitives

Not supported (MVP):
- absolute positioning / freeform dragging
- arbitrary resize handles that produce arbitrary CSS

### Flex-first layout primitives

To keep layout “intelligent”, provide a minimal set of primitives:
- `Container` (max width + padding)
- `Stack` (flex-col)
- `Row` (flex-row)
- `FlexItem` (basis/grow/shrink for “smart resizing”)
- `Divider`, `Spacer`

Resizing a child in a `Row` operates on `FlexItem` props:
- set `basis` to a tokenized fraction (`1/2`, `1/3`, …) and/or
- adjust `grow` weights
- allow responsive overrides (per breakpoint)

This keeps the layout system expressible but not chaotic.

## Inspector panel (contracts → controls)

The inspector panel is fully driven by component contracts:
- prop list with types and requiredness
- control widget selection (text, select, token picker, image picker, binding picker, etc.)
- responsive override UI for props marked `responsive`

### Binding picker (integration with Flow)

When a prop’s type is “bindable” (e.g. `Post[]`, `Promise<Post[]>`, `User | null`), the inspector can bind it to:
- an output from the Flow graph (script-derived)
- a built-in source (route params, query params, current user, theme)

Binding must be type-compatible (TypeScript assignability rules).

## Text and media editing

Text and media editing should feel “inline”:
- `Text`: direct inline editing in place (single-line or multi-line)
- `RichText`: in-place ProseMirror editor (similar to current repo)
- `Image`: in-place image picker/cropper/upload (similar to current repo)

These are just components with contracts; the editor wraps them with selection affordances and routes edits to props.

## Theme editing

Theme is a versioned artifact:
- colors, spacing scale, radius, typography tokens
- component styles are expressed via tokens (not arbitrary Tailwind strings by default)

Theme editor UI:
- token palette editor
- preview impact (live)
- publish/rollback via pointers

## Editor compositions (tenant-local reusable components)

Editors can extract a selected subtree into a **composition**:
- creates a new `composition` artifact and initial version
- replaces subtree with a reference to the composition version
- compositions are insertable via the component library

Composition contracts can be:
- automatically inferred (props exposed = mapped props from children)
- optionally curated by a privileged role

## Save / publish UX

Suggested flow:
- “Save draft” creates a new artifact version and updates `draft:<user>` pointer
- “Promote to preview” assigns `preview` pointer
- “Promote to staging” assigns `staging` pointer (optionally requires approval)
- “Publish” assigns `prod` pointer
- “Rollback” selects a previous version and assigns the pointer

All promotions are pointer swaps; builds must be `built` (or build is triggered and promotion is blocked until success).

