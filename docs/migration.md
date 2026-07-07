# CopilotKit migration decision

## Decision

We will migrate the flights client incrementally to `@copilotkit/angular`.

The target shape is a hybrid:

- CopilotKit owns the model-facing tool registration, tool-call rendering, and
  eventually the agent/chat integration.
- flights keeps the domain-specific host code that CopilotKit does not provide:
  the component registry behind `showComponents`, MCP Apps rendering, AG-UI
  interrupt UX wiring, and workflow progress display.
- We will not build a compatibility adapter from `@a2ui/angular` to
  `@copilotkit/a2ui-renderer`. Instead, the affected client code should move to
  CopilotKit-native concepts such as `registerFrontendTool`, AG-UI messages,
  status state, and tool-call data.
- We choose Option 2 from the evaluation: keep the flights assistant shell and
  use CopilotKit headlessly.
- We will implement Option 2 without introducing a new assistant facade. The UI
  should read CopilotKit's store primitives directly where practical.
- The current `ChatRegistry` does not have to be preserved 1:1.

## `showComponents`

We will replace the model-facing `showComponents` tool with
`registerFrontendTool`.

The `showComponents` tool itself can be replaced by `registerFrontendTool`;
only the domain-specific component registry behind the tool remains flights
code.

The CopilotKit registration should expose the same intent:

```ts
registerFrontendTool({
  agentId: 'ticketingAgent',
  name: 'showComponents',
  description: 'Render registered flights UI components in the chat.',
  parameters: showComponentsSchema,
  component: ShowComponentsRenderer,
  followUp: false,
  handler: async (args) => args,
});
```

The tool itself moves to CopilotKit. The registry behind it stays flights code:

- schema definitions for `messageWidget`, `flightWidget`, `planWidget`, and
  similar components
- mapping from component names to Angular components
- rendering through `NgComponentOutlet`
- support for `captureProps`, especially for state snapshots such as
  `planWidget`
- any project-specific validation and error messages

This gives us CopilotKit's standard tool lifecycle without losing the current
domain-specific component rendering model. The renderer should be implemented
directly for CopilotKit instead of routing through the existing
`@a2ui/angular/v0_9` catalog.

## Other migration choices

- Client-side tools such as `findFlights` and `toggleFlightSelection` should
  move from `defineAgUiTool` to `registerFrontendTool`.
- Server-side action tools such as `bookFlightTool` and `cancelFlightTool`
  should be rendered with `registerRenderToolCall`.
- Existing action-card code can be reused where useful, but the components
  should be migrated directly to CopilotKit's `AngularToolCall` API. Do not
  keep an adapter that maps back to the old `AgUiActionData` contract.
- MCP Apps remain custom. If the server keeps emitting
  `activityType: "mcp-apps"`, we will integrate them through a CopilotKit
  activity renderer. This is the intended migration path for MCP Apps. The
  renderer config should be exposed as a named constant, for example
  `mcpAppsActivityRendererConfig`, so `provideCopilotKit` does not inline the
  raw `{ activityType, content, component }` object.
- AG-UI interrupt/resume is supported by CopilotKit's underlying AG-UI agent
  layer. With the custom flights assistant shell, we still need UI wiring that
  renders `agent.pendingInterrupts` and resumes with `ResumeEntry[]`, for
  example via `buildResumeArray(...)`.
- Human-in-the-loop client flows should be migrated directly to CopilotKit,
  especially `registerHumanInTheLoop`, without an adapter back to the old client
  abstractions. Existing approval/options UI code can be reused only after its
  component inputs and response handling have been converted to the CopilotKit
  API.
- The current `@a2ui/angular/v0_9` catalog should not be migrated through an
  adapter. If we need equivalent UI behavior, we will reshape the client code
  around CopilotKit's frontend tools, render tools, messages, status, and
  tool-call APIs.

## A2UI

`@copilotkit/angular` includes A2UI integration, but it is not the same API as
the current `provideA2uiCatalog` setup around `@a2ui/angular/v0_9`.

The migration decision is:

- do not build a compatibility adapter from `@a2ui/angular/v0_9` to
  `@copilotkit/a2ui-renderer`
- use CopilotKit's built-in A2UI rendering where it directly replaces current
  `WidgetContainerComponent` / `A2uiRendererService` usage
- reshape equivalent UI behavior around CopilotKit-native frontend tools,
  render tools, messages, status, and tool-call APIs where needed
- wire current A2UI action handlers such as `checkIn` and `submitAnswer` to
  CopilotKit's A2UI action bridge when that path is migrated; until then, keep
  existing handler wiring only as legacy code, not as an adapter layer

## Tool registration

Tool definitions should stay in dedicated files, similar to the current
`defineAgUiTool` setup. The registration itself should happen in the provider
function for the corresponding Copilot agent, because that is also where the
matching `agentId`, AG-UI `HttpAgent`, and `injectAgentStore(agentId)` are
known.

See `docs/client-tools-and-components.md` for the conceptual distinction between
browser-executed frontend tools, component selection through
`registerFrontendTool({ component })`, and pure tool-call rendering through
`registerRenderToolCall`.

The preferred shape is:

- always expose frontend tools and render-tool-call configs through factory
  functions, even when a constant object would be enough
- keep schema, name, description, and handler together in the frontend tool
  factory
- derive named TypeScript types next to their Zod schemas, and do not use
  `z.infer<typeof schema>` ad hoc in renderer or tool signatures
- keep tool name, args schema, and component together in the render-tool-call
  factory
- call `registerFrontendTool`, `registerRenderToolCall`, or
  `registerHumanInTheLoop` from the use-case owner during synchronous
  initialization
- let the handler use Angular `inject(...)` when it needs stores, router, or
  other scoped services
- avoid registering tools at module top level
- avoid registering the same `agentId + toolName` from multiple live component
  instances

Frontend tools use a small factory whose variable part is the `agentId`:

```ts
export function createFindFlightsTool(
  agentId: string,
): FrontendToolConfig<FindFlightsArgs> {
  return {
    agentId,
    name: 'findFlights',
    description: 'Searches for flights and opens the result page.',
    parameters: findFlightsSchema,
    handler: async ({ from, to }) => {
      const flightStore = inject(FlightStore);
      const router = inject(Router);

      flightStore.updateFilter(from, to);
      await router.navigate(['/ticketing/booking/flight-search']);

      return { ok: true };
    },
  };
}
```

Render tool calls follow the same pattern:

```ts
export function createBookFlightRenderToolCall(
  agentId: string,
): RenderToolCallConfig<BookFlightArgs> {
  return {
    agentId,
    name: 'bookFlightTool',
    args: bookFlightArgsSchema,
    component: BookFlightToolCallRenderer,
  };
}
```

The owner registers the factory results for the relevant agent:

```ts
registerFrontendTool(createFindFlightsTool('ticketing.execute'));
registerFrontendTool(createFindFlightsTool('travel-planner'));
registerRenderToolCall(createBookFlightRenderToolCall('ticketing.execute'));
```

No additional mode parameter is planned. If a use case needs different
semantics, description, parameters, or behavior, it should get a separate tool
factory or explicit tool variant.

## Agent providers

Each use case should expose a `provide...CopilotAgent()` function. This provider
function initializes the self-managed AG-UI `HttpAgent` for the existing
`/ag-ui/:agentId` route and registers the tools, tool-call renderers,
human-in-the-loop tools, and activity renderers for the same `agentId`.

The provider should not add a custom `onDestroy` cleanup for the `HttpAgent`. If
the route/use case is initialized again, the agent entry for the same `agentId`
is overwritten. CopilotKit's own `DestroyRef` handling still owns the lifetime
of `registerFrontendTool`, `registerRenderToolCall`, and
`registerHumanInTheLoop` registrations.

```ts
export function provideTicketingCopilotAgent(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const config = inject(ConfigService);
      const copilotKit = inject(CopilotKit);
      const agentId = 'ticketingAgent';

      copilotKit.updateRuntime({
        selfManagedAgents: {
          ...copilotKit.agents(),
          [agentId]: new HttpAgent({
            agentId,
            url: config.agUiUrlFor(agentId),
          }),
        },
      });

      registerFrontendTool(createFindFlightsTool(agentId));
      registerRenderToolCall(createBookFlightRenderToolCall(agentId));
      registerHumanInTheLoop(createRequestApprovalTool(agentId));
    }),
  ]);
}
```

This replaces `agUiResource` in migrated use cases while keeping the existing
server routes.

## Runtime URL

The CopilotKit runtime URL is configurable. The common example path
`/api/copilotkit` is only a convention, not a requirement.

The migration preference is to keep the current server routes, especially
`/ag-ui/:agentId`, and adapt the client integration around them. Server-side
changes should be avoided and made only if there is no viable client-side
solution.

If a CopilotKit runtime endpoint becomes unavoidable, flights should choose a
route name that fits the existing backend API, for example `/ai/runtime` or
another project-specific path. The only requirement is that the server route and
the Angular `runtimeUrl` point to the same endpoint:

```ts
provideCopilotKit({
  runtimeUrl: 'http://localhost:3001/ai/runtime',
});
```

If the URL comes from runtime configuration, keep it in the flights
configuration model and feed that value into CopilotKit instead of hardcoding a
`copilotkit` path.

## Assistant shell API

The frontend shell only needs access to a few primitives:

- `send(content)` to send a user message
- `messages()` to iterate all AG-UI messages
- `isLoading()` or `isRunning()` for the current run status
- `toolCalls()` or equivalent derived data for status/details rendering
- optionally `state()` and `pendingInterrupts()` if the UI renders agent state
  or approval/options flows

These primitives should come directly from CopilotKit's
`injectAgentStore(agentId)` and related registration APIs. We should avoid a new
project-level facade unless concrete duplication or testability pressure appears
during implementation.

The UI can keep its current panel, mode selector, and layout without keeping the
old `ChatRegistry` and `AgUiChatMessage` model unchanged.

## Initial implementation sequence

1. Add and align `@copilotkit/angular` and AG-UI package versions.
2. Build a small ticketing spike using Option 2 without a project-level facade:
   keep the flights shell and bind it directly to CopilotKit's agent store,
   backed by the existing `/ag-ui/ticketingAgent` route.
3. Migrate `showComponents` to `registerFrontendTool` while preserving the
   flights component mapping internally, without depending on
   `@a2ui/angular/v0_9`.
4. Migrate one browser tool, for example `findFlights`, by keeping the tool
   factory in its own file and registering it from the use-case
   `provide...CopilotAgent()` function.
5. Migrate one action-card renderer, for example `bookFlightTool`, using the
   same factory-and-owner-registration pattern and updating the card component
   itself to the CopilotKit tool-call API.
6. Migrate MCP Apps rendering to a custom CopilotKit activity renderer.
7. Migrate one human-in-the-loop approval/options flow directly to
   `registerHumanInTheLoop`.
8. Revisit the assistant shell and decide whether direct store usage remains
   sufficient or whether parts of `<copilot-chat>` should be adopted.

## Non-goals for the first step

- Do not delete `libs/ag-ui-client` wholesale.
- Do not change the server side unless there is no viable client-side solution.
- Do not replace the existing `/ag-ui/:agentId` routes.
- Do not rewrite MCP Apps.
- Do not build compatibility adapters in general. Convert the relevant client
  code to CopilotKit APIs when that flow is migrated.

This document is the source of truth for migration decisions. See
`docs/copilot-eval.md` for evaluation details, risks, examples, and source
notes, and `docs/client-tools-and-components.md` for the tool/component
rendering model. If these documents differ, `docs/migration.md` takes
precedence.
