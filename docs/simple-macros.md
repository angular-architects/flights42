# Simple macros for the dashboard

Status: plan, 2026-11-11. Baseline: `136cf71f` on `AGU-a2ui-express`.
Related: [upstream/a2ui-ts-macros-port-plan.md](upstream/a2ui-ts-macros-port-plan.md)
(the full SDK port this interim solution stays close to).

## Goal

- Replace the hand-written tile compiler (`switch` in `buildTile`, central
  `fetchAllDashboardData`, `DashboardSpec`) with a generic `applyMacros`
  that knows nothing about the dashboard.
- One place per tile: each macro bundles its Zod schema, data loading and
  rendering.
- The Express catalog, the node types and the cache validation are derived
  from the macro map.
- No change to the LLM contract: `renderDashboard` input, dashboard prompt
  and schema key order (positional Express arguments) stay as they are.

## Design

### Macro definition

```ts
export interface MacroNode {
  id: string;
  component: string;
}

export type MacroInput<TSchema extends z.ZodType> = z.output<TSchema> & {
  id: string;
};

export interface MacroResult {
  components: A2uiComponent[];
  data?: unknown;
}

export interface MacroRun {
  call<T>(
    name: string,
    args: Record<string, unknown>,
    fn: () => T | Promise<T>,
    summarize?: (value: T) => unknown,
  ): Promise<T>;
}

export interface Macro<TSchema extends z.ZodType, TData> {
  schema: TSchema;
  load?: (node: MacroInput<TSchema>, run: MacroRun) => Promise<TData>;
  render: (node: MacroInput<TSchema>, data: TData) => MacroResult;
}

export function defineMacro<TSchema extends z.ZodType, TData = undefined>(
  macro: Macro<TSchema, TData>,
): Macro<TSchema, TData> {
  return macro;
}
```

`defineMacro` only exists so TypeScript carries `TData` from `load` to
`render` and infers the node type from the schema. Macro code never writes
`z.infer`.

### `applyMacros(components, macros, config)`

```ts
export interface ApplyMacrosConfig {
  recursive: boolean;
}

export async function applyMacros(
  components: A2uiComponent[],
  macros: MacroMap,
  config: ApplyMacrosConfig = { recursive: false },
): Promise<AppliedMacros>;
```

Input: the component list of the `updateComponents` message that
`compileExpress` returns. Output: `{ components, data, steps }`.

A component is a macro node if its `component` is a key of `macros`. Every
other component passes through unchanged. `applyMacros` knows no terminal
components.

Expansion runs in waves:

1. Collect the macro nodes of the current list.
2. Run their `load` in parallel with one `MacroRun` shared by all waves.
3. Run `render` synchronously in list order and replace each macro node in
   place with its rendered components.
4. `recursive: false`: stop after the first wave. Rendered components pass
   through unchanged, macro nodes included. `recursive: true`: repeat with
   the new list until it holds no macro node.
5. Emit one data entry `{ path: '/<node.id>', value: result.data }` per
   macro that returns data, across all waves.

`MAX_MACRO_DEPTH = 16`, as in the Python `MacroExpander`. A wave beyond it
throws and names the remaining macro components. This stops macros that
render themselves directly or through a cycle.

Contract for `render`:

- Exactly one returned component has `id === node.id` (the macro root).
  Parent `child`/`children` references therefore stay valid without
  rewriting. `applyMacros` throws if the root is missing. If the root is a
  macro node itself, its expansion keeps the id.
- Other ids use the prefix `<node.id>-`, data paths `/<node.id>/…`. Nested
  macro nodes therefore get unique ids and data paths as well.
- The Express parser already assigns unique ids (`root`,
  `root_children_0`, …) and requires `root = …`.

Validation: the A2UI processor already validated the first-wave nodes
against the catalog, so `applyMacros` does not parse them. Nodes rendered
by a macro are unvalidated: from the second wave on, `applyMacros` parses
them with `macro.schema.parse` and re-attaches `id`. Macros take no child
slots.

### `MacroRun.call`

- Memoizes per run on `name` + `JSON.stringify(args)`. Five tiles needing
  booked flights cause one fetch, one route shared by three tiles one
  `searchFlights`.
- Records a step `{ name, args, result }` on the first call only. `result`
  comes from `summarize` (today's summaries: `{ count }`,
  `{ condition, temperatureC }`, …).
- The memo lives for one `applyMacros` call. Data is always fresh.

`DataStep` moves into the generic module with the same shape, so
`buildDataStepEvents` in `dashboard-utils.ts` stays as is.

### Catalog

```ts
export function toMacroCatalog(macros: MacroMap, catalogId: string) {
  const components: Record<string, unknown> = {};
  for (const name of Object.keys(macros)) {
    components[name] = macros[name].schema.toJSONSchema();
  }
  return { catalogId, components };
}
```

Feeds `InMemoryCatalogProvider` → `CatalogConfig` → `A2uiGenerator` →
`dashboardProcessor` as today. Replaces the hand-maintained list in
`express-to-dashboard-spec.ts`.

### `Dashboard` is a macro

```ts
Dashboard: defineMacro({
  schema: dashboardSchema,
  render: (node) => {
    return {
      components: [
        { id: node.id, component: 'Column', children: node.children },
      ],
    };
  },
}),
```

No filtering, no hand-built root.

### Cache

Cache the Express string instead of the spec: `{ express: string }`.

- Hit: `compileDashboard(express)` parses, validates against the macro
  catalog and loads fresh data.
- Replay sends `TOOL_CALL_ARGS` as `JSON.stringify({ express })`, which is
  what the LLM sends. Today the replay sends the spec JSON, which does not
  match the `renderDashboard` input schema.
- Old `{ spec }` entries (in `../cache`, gitignored) count as misses.

## Load and render per macro

All tool calls go through `run.call` with the step names and summaries
used today.

| Macro                                  | `load`                                                                       | `render` (from today's builder)     |
| -------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| `Dashboard`                            | none                                                                         | `Column`                            |
| `FlightsTable`, `DelayedFlightsTable`  | `searchFlights`                                                              | `buildFlightsTable(…, onlyDelayed)` |
| `DelayShareChart`, `DelaysPerDayChart` | `searchFlights`, aggregation, `renderFlightChart` (`buildAndCacheChartUrl`)  | `chartTile`                         |
| `BoardingPasses`                       | `findBookedFlights`                                                          | `buildBoardingPasses`               |
| `BookedFlightsList`                    | `findBookedFlights`; `weatherForecast` per displayed flight if `showWeather` | `buildBookedFlightsList`            |
| `FlightSearch`                         | none                                                                         | `buildFlightSearch`                 |
| `RentalCars`, `Hotels`                 | `findBookedFlights` only without `city`; `searchRentalCars` / `searchHotels` | `imageRowList`                      |
| `WeatherList`                          | `findBookedFlights`; `weatherForecast` per displayed flight                  | `buildWeatherList`                  |

Chart rendering stays in `load` so the `renderFlightChart` step remains
visible. Sorting and `maxRows` slicing happen in `load` where they decide
which flights need a forecast.

## Steps

1. **Generic module** `ai-server/src/mastra/a2ui/simple-macros/` (replaces
   `interim-macros/`):
   - `macro.ts`: types, `defineMacro`, `MacroMap`, `toMacroCatalog`,
     `DataStep`.
   - `apply-macros.ts`: `applyMacros`, `ApplyMacrosConfig`,
     `MAX_MACRO_DEPTH`, `MacroRun` implementation.
2. **Dashboard macros** `dashboard-dsl/dashboard-macros.ts`: `dashboardMacros`
   map. Move the builders from `compile-dashboard.ts` and switch them to
   `(node, data)`. `tileId(idx, …)`/`pathFor(idx, …)`/`tilePath(idx)` take
   `node.id`. Each tile's `Card` gets `node.id`.
3. **Pipeline** `dashboard-dsl/compile-dashboard.ts`:
   - `dashboardProcessor` from `toMacroCatalog(dashboardMacros, …)`.
   - `compileDashboard(express, options)`: `compileExpress` → throw
     "renders no tiles" if `Dashboard` has no children → `applyMacros` →
     `createSurface` (`A2UI_CATALOG_ID`, `dash-<uuid>`) + `updateComponents`
     - one `updateDataModel` per data entry.
   - `applyMacros` uses the default config: Express returns a flat list,
     the tiles are siblings of `Dashboard` and expand in the first wave.
   - Return type `CompiledDashboard` unchanged. `DISPLAY_DSL` logs the
     Express string.
   - Delete `assembleDashboard`, `buildTile`, `fetchAllDashboardData`,
     `DashboardData`, `TileBuildResult`.
4. **Schemas** `dashboard-dsl/dashboard-spec.ts`: keep the tile schemas
   unchanged, delete `dashboardTileSchema`, `dashboardSpecSchema`,
   `DashboardTile`, `DashboardSpec`.
5. **Delete** `a2ui/interim-macros/express-to-dashboard-spec.ts`.
6. **Route and cache**:
   - `dashboard-cache.ts`: entry `{ express }`, `toCacheEntry` checks for a
     string, drop the outdated `DashboardSpec` header comment.
   - `dashboard-utils.ts`: `parseAccumulatedSpec` →
     `parseAccumulatedExpress` (JSON + `renderDashboardInputSchema`),
     `handleRenderToolCallEnd` calls `compileDashboard(express)`,
     interceptor `spec()` → `express()`, `streamCachedDashboard` takes
     the Express string, `tryRead/WriteDashboardCache` use strings.
   - `dashboard-ag-ui-route.ts`: `cachedSpec` → `cachedExpress`.
7. `npm run lint -- --fix`.

Unchanged: `render-dashboard.ts`, `dashboard-agent.prompt.ts`,
`a2ui-express.ts`, the ticketing path, the frontend.

## Accepted behavior changes

- Steps in the tool-call panel follow call order, not tile order. Tile order
  in the UI is unaffected (it comes from `Dashboard.children`).
- `weatherForecast` runs once per flight even if `BookedFlightsList` and
  `WeatherList` both show it.
- Component ids and data paths change from `t<idx>-…` / `/t<idx>/…` to
  `<node.id>-…` / `/<node.id>/…`. Nothing outside the compiler references
  them.
- An invalid Express program now ends in `run_error` instead of
  `invalid_dashboard_spec`. `invalid_dashboard_spec` remains for args that
  are not valid JSON. Both codes are server-internal.
- Old cache entries are regenerated once by the LLM.

## Verification

- `npx tsc -p ai-server/tsconfig.json --noEmit`, `npm run lint`.
- Scratchpad script (not in the repo): compile the same Express programs
  with the baseline and the new `compileDashboard`. Component trees must
  match up to ids and paths, data values must match. Additionally, a test
  macro map with a macro that renders another macro (`recursive` false and
  true) and a self-rendering macro (throws at `MAX_MACRO_DEPTH`).
- Live: dashboard request with `preventCaching`, the same request again
  (cache hit, replay args show `{ express }`), a check-in button
  (`a2uiAction` path).

## Out of scope

- `Catalog.derive` from web_core 0.15: needs a server-side 0.15 next to the
  frontend's 0.10.x and Zod 3 schemas. Separate step.
- Child slots, mixing macros with basic components in one catalog.
- Generating the tile reference in `dashboard-agent.prompt.ts` from the
  schemas.
