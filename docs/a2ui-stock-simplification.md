# A2UI simplification with stock building blocks

Status: proposal, not executed. Written 2026-09-14 from a source-level
analysis of the installed packages (`@ag-ui/mastra` 1.1.2,
`@ag-ui/a2ui-middleware` 0.0.10, `@ag-ui/a2ui-toolkit` 0.0.4,
`@copilotkit/shared` 1.70.1, `@a2ui/web_core` 0.10.6). Nothing in this
document has been verified at runtime.
Related docs: [stock-adapter-migration.md](stock-adapter-migration.md)
(phase D, variants A/B, draft #8),
[upstream/ag-ui-mastra-issues.md](upstream/ag-ui-mastra-issues.md) (#2669).

## Goal

- Shrink `ticketing-agent.prompt.ts` by removing the hand-written A2UI
  protocol text (message envelope, format rules, three JSON examples).
- Replace custom A2UI code with exported stock helpers wherever that costs
  no behavior.
- **Constraint:** details of the basic catalog are neither transmitted by the
  client nor written into the prompt by hand. Only the custom components
  travel as schema.

## Current state (variant B, draft #8)

1. The client (`src/app/domains/shared/util-copilotkit/a2ui/catalog-context.ts`)
   sends one context entry with `A2UI_SCHEMA_CONTEXT_DESCRIPTION` and
   `{ catalogId, components }`. Basic components are filtered out.
2. `addCustomCatalogInstructions` reads that entry from
   `requestContext.get('ag-ui')`, passes the catalog id into
   `ticketingAgentPrompt(catalogId)` and appends a readable section for the
   custom components (`catalog-context.ts`, `schema-example.ts`).
3. The agent calls `renderA2uiTool` with `{ messages: A2uiMessage[] }`
   (complete v0.9 envelope including `createSurface` and `catalogId`). The
   tool validates and returns `{ surfaceId, a2ui_operations }`.
4. `A2UIMiddleware({ injectA2UITool: false })` finds the envelope in
   `TOOL_CALL_RESULT` and emits the `a2ui-surface` activity.

Size today:

| Part                                                | Lines |
| --------------------------------------------------- | ----- |
| `ticketing-agent.prompt.ts` total                   | 393   |
| – "Generative UI via A2UI" incl. examples (110-280) | 171   |
| – search-form rule (72-80)                          | 9     |
| – table example (386-391)                           | 6     |
| `a2ui/render-a2ui.tool.ts`                          | 231   |
| `a2ui/catalog-context.ts`                           | 100   |
| `a2ui/schema-example.ts`                            | 87    |
| `a2ui/add-custom-catalog-instructions.ts`           | 38    |

Most of the prompt block explains the v0.9 envelope (`version`,
`createSurface`, `catalogId`, `updateDataModel`) and basic-catalog details
(`child` vs `children`, component list) — exactly what the constraint rules
out and what stock helpers already cover.

## Findings that drive the design

### The middleware cannot put A2UI instructions into a Mastra prompt

With `injectA2UITool: true` the middleware injects a `render_a2ui` tool and
`RENDER_A2UI_TOOL_GUIDELINES` — but only as `RunAgentInput.context`.
`MastraAgent.applyInputContext` forwards context solely to
`requestContext.get('ag-ui')`; it never reaches the system prompt. In
addition, the flag makes the adapter auto-inject `generate_a2ui` (see below).
An instructions function on our side is therefore always required.

### Stock `generate_a2ui` (variant A) is blocked

- **#2669 (open, no PR):** the render subagent receives only user/assistant
  text. Tool results are filtered, the assistant message with the
  `generate_a2ui` call is stripped, and `changes` is ignored on
  `intent: 'create'`. The booked-flights table renders empty (reproduced in
  the stock migration, see its verification table).
- One additional LLM call per surface; the main agent loses control over the
  layout.
- An interim wrapper (own `generate_a2ui` with a `content` argument that is
  pushed into `requestContext` before delegating to `getA2UITools`) would be
  ~60 lines and work around #2669, but brings all costs of variant A now and
  relies on when the adapter reads `requestContext`. **Rejected.**

### Ready-made A2UI prompt text

| Package / export                                                              | Usable without basic catalog schema?                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@ag-ui/a2ui-toolkit`: `DEFAULT_GENERATION_GUIDELINES`                        | **Yes.** Names basic components, explains ids, `child`/`children`, action format, path binding, forms, templates.               |
| `@ag-ui/a2ui-toolkit`: `DEFAULT_DESIGN_GUIDELINES`                            | Not wanted: recommends Google favicons and placehold.co images.                                                                 |
| `@ag-ui/a2ui-toolkit`: `splitA2UISchemaContext`, `buildContextPrompt`         | Yes. `buildContextPrompt` also dumps every other context entry, so use `splitA2UISchemaContext`.                                |
| `@ag-ui/a2ui-middleware`: `RENDER_A2UI_TOOL_GUIDELINES`                       | No: demands component names from the schema; example uses non-basic `Title`/`Metric`.                                           |
| `@ag-ui/a2ui-middleware`: `A2UI_PROMPT`                                       | No: deprecated, full basic-catalog reference, outdated (`send_a2ui_json_to_client`, TextField `text` binding).                  |
| `@copilotkit/shared`: `A2UI_DEFAULT_GENERATION_GUIDELINES` / `..._DESIGN_...` | No: "ONLY use components listed in the Available Components schema" and "check the component schema" require the basic catalog. |
| `@a2ui/web_core` 0.10.6 / 0.11.0                                              | Nothing prompt-related.                                                                                                         |

All stock texts describe the **flat** tool shape
`render_a2ui({ surfaceId, components, data? })`, not our `{ messages }`
envelope.

### Server tool calls are not streamed live

The adapter buffers a server tool's `tool-call` chunk and emits
`TOOL_CALL_START/ARGS/END` with the complete args. Live start events for
server tools are opt-in via #2403 (merged 2026-09-14, not released; latest
`@ag-ui/mastra` is 1.1.3 from 2026-09-08). The middleware's streaming path
would therefore bring no progressive rendering today, and it would paint the
surface from the args before our `execute` validation has run.

## Target design: flat variant B on stock building blocks

### 1. Render tool in the stock shape

- Tool id `render_a2ui`, input `{ surfaceId, components, data? }` — the same
  contract `DEFAULT_GENERATION_GUIDELINES` describes.
- `execute` builds the operations itself with the toolkit's `assembleOps`
  (`createSurface` + `updateComponents` + `updateDataModel` at `/`). The
  catalog id comes from `readCatalogId(requestContext.get('ag-ui')?.context)`
  with `A2UI_DEFAULT_CATALOG_ID` as fallback — the model never sees it.
- Validation uses the toolkit's `validateA2UIComponents({ components, data })`
  and `formatValidationErrors`. It reports duplicate/missing ids, missing
  `component`, unresolved child references, **unresolved absolute bindings**
  (catches the unseeded form path that today only the prompt warns about),
  child cycles and a missing `root`.
- Keep our own child-shape check (Card/Button/Modal need `child`, Row/Column/
  List need `children`): the stock validator cannot detect it without a
  catalog.
- Errors are thrown as today, so the model retries with the error text.

```ts
export const renderA2uiInputSchema = z.object({
  surfaceId: z.string(),
  components: z.array(z.record(z.string(), z.unknown())),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type RenderA2uiInput = z.infer<typeof renderA2uiInputSchema>;

export const renderA2uiTool = createTool({
  id: 'render_a2ui',
  description:
    'Render a custom A2UI surface. Follow the A2UI Protocol Instructions in the system prompt.',
  inputSchema: renderA2uiInputSchema,
  execute: async ({ surfaceId, components, data }, context) => {
    const errors = [
      ...validateA2UIComponents({ components, data }).errors,
      ...childShapeErrors(components),
    ];
    if (errors.length > 0) {
      throw new Error(
        `render_a2ui: invalid surface\n${formatValidationErrors(errors)}`,
      );
    }
    const catalogId =
      readCatalogId(readAgUiContext(context.requestContext)) ??
      A2UI_DEFAULT_CATALOG_ID;
    const operations = assembleOps({
      intent: 'create',
      surfaceId,
      catalogId,
      components,
      data,
    });
    return { surfaceId, [A2UI_OPERATIONS_KEY]: operations };
  },
});
```

Optional, later: a server-side validation catalog built from
`BASIC_COMPONENTS` (`@a2ui/web_core/v0_9/basic_catalog`, Zod schemas →
`zod-to-json-schema`) plus the custom components from the context entry.
Passed as `catalog` to `validateA2UIComponents`, it adds unknown-component
and missing-required-prop errors. It is **never sent to the model**, so it
respects the constraint. Open: whether `basic_catalog` imports cleanly in
Node (the module also exports `injectBasicCatalogStyles`).

### 2. Instructions: stock guidelines plus custom components

Replace `addCustomCatalogInstructions` with an instructions function that
appends the stock generation guidelines and the raw custom-catalog entry:

```ts
export function withA2uiInstructions(
  systemInstructions: string,
): (params: InstructionsParams) => string {
  return ({ requestContext }) => {
    const [schema] = splitA2UISchemaContext(readAgUiContext(requestContext));
    const sections = [systemInstructions, DEFAULT_GENERATION_GUIDELINES];
    if (schema) {
      sections.push(`## Available Components\n${schema}`);
    }
    return sections.join('\n\n');
  };
}
```

- `ticketingAgentPrompt` becomes a plain string (no `catalogId` parameter).
- `DEFAULT_DESIGN_GUIDELINES` is **not** included.
- The custom section is the raw JSON Schema (`allOf`, `$ref` noise, no
  example props). If model quality suffers, keep the readable
  `catalogToPromptSection` instead of the raw entry; `schema-example.ts` then
  stays.
- Runtime prompt size barely drops (the stock guidelines are ~70 lines); the
  gain is the shorter source and not maintaining protocol text ourselves.

### 3. Remaining own A2UI block in the prompt (~20 lines)

Replaces lines 110-280. Draft:

```
## Generative UI via A2UI

- For a CUSTOM layout — a table ("als Tabelle"), a card view, a form, or any
  richer UI than the standard cards — call render_a2ui exactly once instead
  of flightWidgets. FIRST gather the data, THEN design the surface. The
  surface IS the complete answer: no flightWidgets, no messageWidget
  repeating the data.
- How to call render_a2ui is described under "A2UI Protocol Instructions".
  All basic A2UI catalog components are available in addition to the custom
  components listed under "Available Components".
- Tables: lay out Rows and give every cell a numeric "weight" (the same
  weight per column index in the header and every data row); use
  "variant": "h5" for header cells.
- Button events: the client reacts to exactly two event names — never invent
  others. This overrides the "submit" name used in the generic form example.
  - "checkIn": context { "flightId": <number> } of a specific booked flight.
  - "submitAnswer": the context references the form fields via
    { "path": "/..." } — the same paths the inputs' "value" is bound to —
    and those paths are pre-filled via "data". The reply arrives as a user
    message { "type": "a2ui_form_response", "surfaceId": "...",
    "context": {...} }; read the values from its "context".
```

Also adjust:

- Search-form rule (72-80): "render a search form via render_a2ui — one Card,
  one TextField per missing value, a submit Button firing submitAnswer,
  paths pre-filled via data".
- Output rules (21-24) and the table example (386-391): rename
  `renderA2uiTool` → `render_a2ui`, drop "createSurface + updateComponents".

### 4. Middleware

```ts
new A2UIMiddleware({ injectA2UITool: false, a2uiToolNames: [] });
```

`a2uiToolNames` defaults to `['render_a2ui']`, which would enable the
streaming path for our tool. Disable it: server tool args arrive complete
anyway (see findings), and the streaming path would paint before `execute`
validates. The result envelope keeps painting the surface as today.
Revisit after #2403 is released.

### 5. Unchanged

- Client catalog forwarding, including the basic-component filter.
- The `a2ui_form_response` round trip and the Angular activity renderer.
- Dashboard route and compiler keep importing `readCatalogId` and
  `A2UI_DEFAULT_CATALOG_ID` from `ai-server/src/mastra/a2ui/catalog-context.ts`.
  **Do not** swap our constant for the stock `BASIC_CATALOG_ID`: stock uses
  `https://a2ui.org/specification/v0_9/basic_catalog.json`, ours is
  `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`.

## Expected effect

| File                                                               | Today | After | Delta |
| ------------------------------------------------------------------ | ----- | ----- | ----- |
| `agents/ticketing-agent.prompt.ts`                                 | 393   | ~240  | ~−155 |
| `a2ui/render-a2ui.tool.ts`                                         | 231   | ~100  | ~−130 |
| `a2ui/catalog-context.ts` (server)                                 | 100   | ~30   | ~−70  |
| `a2ui/schema-example.ts`                                           | 87    | 0     | −87   |
| `a2ui/add-custom-catalog-instructions.ts` → `withA2uiInstructions` | 38    | ~30   | ~−8   |

Roughly −450 lines, no additional LLM call, no additional payload. If the
readable custom section is kept, `catalog-context.ts` and
`schema-example.ts` stay (~−290 instead).

## Implementation steps

1. Add `"@ag-ui/a2ui-toolkit": "0.0.4"` as a direct dependency in the root
   `package.json` (today it only arrives transitively via the middleware).
2. Rewrite `render-a2ui.tool.ts` to the flat shape (section 1).
3. Add `withA2uiInstructions`, delete `add-custom-catalog-instructions.ts`;
   reduce the server `catalog-context.ts` to `readCatalogId` and
   `A2UI_DEFAULT_CATALOG_ID`; delete `schema-example.ts`.
4. Rewrite the A2UI parts of `ticketing-agent.prompt.ts` (section 3).
5. Update `ticketing-agent.ts` (tool, instructions, middleware config).
6. Run the linter with `--fix`.
7. Smoke-test (next section) and record the results in this document.

## Verification

| Scenario                                      | Pass criterion                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| "Gib mir meine Flüge als Tabelle"             | One surface, rows contain the booked flights, columns aligned.                  |
| Booked flights as cards                       | Cards render content (Card → `child` → Column).                                 |
| Flight search without from/to                 | One Card form; typed values arrive in `a2ui_form_response`; `findFlights` runs. |
| Check-in button on a booked flight            | `checkIn` fires with a numeric `flightId`.                                      |
| Custom catalog component requested explicitly | The custom component is used with valid props.                                  |
| Validation error (e.g. unseeded binding)      | Model retries with the error text; no broken surface is painted.                |
| Plain question ("Did I book Paris?")          | Widgets as before, no A2UI surface.                                             |
| Dashboard                                     | Unchanged.                                                                      |

## Risks and open questions

- **Model quality without basic-catalog details.** The model relies on
  `DEFAULT_GENERATION_GUIDELINES` and its own A2UI knowledge; the old prompt
  existed because models slipped on exactly these details. The flat shape
  removes the envelope errors, but optional prop names (e.g. `Image.url`,
  `Icon` names) are neither explained nor validated.
- **Raw custom schema vs. readable section** (section 2).
- **Stock text drifts on upgrades.** Pin `@ag-ui/a2ui-toolkit` and diff
  `DEFAULT_GENERATION_GUIDELINES` on every bump; it names `render_a2ui`
  literally, so a rename upstream breaks the contract.
- **Event name conflict:** the stock form example uses `submit`; the own
  block must keep overriding it.

## Later: stock `generate_a2ui` (variant A)

Preconditions: #2669 fixed and released; #2691 released (a resumed run gets
the auto-injected A2UI toolset — needed after book/cancel approvals).

Then:

- Enable `a2ui: { model, defaultCatalogId }` on `MastraAgent` (or wire
  `getA2UITools` from `@ag-ui/mastra/a2ui`); delete `render_a2ui` and
  `withA2uiInstructions`.
- Move the own A2UI block (event contract, `weight`, "basic components are
  available too") into `guidelines.compositionGuide`; set
  `designGuidelines: ''`.
- Keep the client filter. Pass the server-side validation catalog (basic +
  custom) as `catalog`; the toolkit feeds validation errors back into the
  subagent prompt and retries (max 3), so basic-catalog details only reach
  the model when it made a mistake.
- Do **not** set `A2UIMiddleware({ schema })`: it would replace the client
  entry and put the full schema into the subagent prompt.
- Cost check: one extra LLM call per surface.

## Upstream status (2026-09-14)

| Item  | Topic                                                      | State                         |
| ----- | ---------------------------------------------------------- | ----------------------------- |
| #2669 | `generate_a2ui` gets no data on `create` (ours)            | Open, no PR, nobody assigned  |
| #2691 | Resumed run gets the tools of the run it continues (#2667) | Merged 2026-09-14, unreleased |
| #2662 | No warning when recall fails on a new thread (ours)        | Merged 2026-09-14, unreleased |
| #2403 | Opt-in live `TOOL_CALL_START` for server tools             | Merged 2026-09-14, unreleased |

Once #2691 and #2662 ship, `resolveResumeCommand`/the resuming proxy and
`ensureThread` in `routes/ag-ui-route.ts` can go as well (separate change).
