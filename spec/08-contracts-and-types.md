# Contracts and Types (Derived from TypeScript)

## Principle: TS is the contract

We prefer **TypeScript types derived from actual code** as the contract source of truth.

Where we need UI affordances (control widgets, categories, icons), we add optional metadata, but **types remain authoritative**.

## Type indexing

Use the TypeScript Language Service to build an index over:
- project code
- enabled plugin code
- relevant external deps (as types only)

The index supports:
- symbol lookup by name
- signature extraction for functions/methods
- type assignability checks
- source location mapping for “go to code”

## Function node contracts (automatic)

Any function/method/constructor can be a Flow node type:
- input ports from parameters
- output port from return type (or instance type)

Optional metadata improves UX (category/tags/kind/runtime) but is not required.

### Metadata (optional)

Support JSDoc tags:
- `@flowName`
- `@flowCategory`
- `@flowTags`
- `@flowKind source|transform|mutation|effect|unknown`
- `@flowRuntime server|client|shared`
- `@flowHidden`

Or an exported map:
`export const flowmeta = { fnName: { ... } }`.

## Component contracts (editor UI)

TypeScript can tell us the *types* of props, but not the *editor UI controls*.

For components intended to be used in the UI editor, we support a minimal contract export:

```ts
export const editor = {
  category: 'Layout',
  props: {
    gap: { control: 'token:space', responsive: true },
    align: { control: 'select', options: ['start','center','end','stretch'] }
  },
  snippets: {
    children: { required: true }
  }
} as const;
```

Rules:
- the contract is optional for flowification but required for UI editor friendliness
- TypeScript tooling validates the contract against actual component prop/snippet expectations

### Suggested contract shape

Contracts are “metadata overlays” for UI. They should not duplicate types; instead they annotate:
- controls
- categories/tags
- responsive affordances
- region/drop constraints

Recommended minimal types:

```ts
export type EditorControl =
  | { type: 'text' }
  | { type: 'textarea' }
  | { type: 'toggle' }
  | { type: 'select'; options: { label: string; value: string }[] }
  | { type: 'number'; min?: number; max?: number; step?: number }
  | { type: 'token'; tokenType: 'color'|'space'|'radius'|'font' }
  | { type: 'image' }
  | { type: 'binding' }; // editor uses TS types to filter compatible bindings

export type EditorPropMeta = {
  control?: EditorControl;
  responsive?: boolean;
  hidden?: boolean;
};

export type EditorSnippetMeta = {
  required?: boolean;
  allowedChildren?: string[]; // logicalIds of components (optional constraint)
};

export type ComponentEditorContract = {
  category?: string;
  tags?: string[];
  props?: Record<string, EditorPropMeta>;
  snippets?: Record<string, EditorSnippetMeta>;
};
```

### Validating against code (TS)

To keep “single source of truth”:
- prop *types* come from TS (Svelte component prop typing)
- the contract only references prop *names* and UI hints

Validation checks (MVP):
- contract prop keys must exist in component props
- contract snippet keys must exist as snippet props (by convention) or be `children`

### Snippet props

Snippet props (including `children`) are declared with:
- requiredness
- optional typed parameters (e.g. for `Each`/`Await` style snippets)

## Remote Functions integration (data sources and mutations)

Remote Functions (query/command) should be indexed and surfaced as:
- data sources (queries)
- mutations (commands)

Derive:
- input types from schema (e.g. valibot) and/or TS types
- output types from TS return types
- runtime classification (server/shared)

## Type fit in editor

The editor enforces type compatibility for:
- prop bindings
- Flow edge connections
- snippet prop parameters

Default rule: TypeScript assignability (`T_out` assignable to `T_in`).

## “Owned region” typing

Generated regions should emit code that is:
- typecheckable in the tenant build context
- stable under formatting
- easy to flowify (simple bindings/callsites)

Prefer emitting one binding per line to maximize Flow readability.
