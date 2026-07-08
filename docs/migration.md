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
export const showComponentsTool = createFrontendTool({
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
`defineAgUiTool` setup. The tool definitions should not know the concrete
`agentId`. The agent binding happens centrally when the agent store is
initialized.

See `docs/client-tools-and-components.md` for the conceptual distinction between
browser-executed frontend tools, component selection through
`registerFrontendTool({ component })`, and pure tool-call rendering through
`registerRenderToolCall`.

The preferred shape is:

- expose frontend tools, render-tool-call configs, and human-in-the-loop configs
  as named constants when they do not need use-case-specific behavior
- use small identity helpers such as `createFrontendTool(...)`,
  `createRenderToolCall(...)`, and `createHumanInTheLoop(...)` for type
  inference and to forbid `agentId` on the tool definition
- keep schema, name, description, and handler together in the frontend tool
  definition
- derive named TypeScript types next to their Zod schemas, and do not use
  `z.infer<typeof schema>` ad hoc in renderer or tool signatures
- keep tool name, args schema, and component together in the render-tool-call
  definition
- call `registerFrontendTool`, `registerRenderToolCall`, or
  `registerHumanInTheLoop` from the agent-store initialization helper
- let the handler use Angular `inject(...)` when it needs stores, router, or
  other scoped services
- avoid registering tools at module top level
- avoid registering the same `agentId + toolName` from multiple live component
  instances

Frontend tools use a small identity helper for type inference. The exported
domain tool itself should have the short domain name, without a `create` prefix:

```ts
const findFlightsSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type FindFlightsArgs = z.infer<typeof findFlightsSchema>;

export const findFlightsTool = createFrontendTool({
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
});
```

Render tool calls follow the same pattern:

```ts
const bookFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type BookFlightArgs = z.infer<typeof bookFlightArgsSchema>;

export const bookFlightRenderTool = createRenderToolCall({
  name: 'bookFlightTool',
  args: bookFlightArgsSchema,
  component: BookFlightToolCallRenderer,
});
```

Human-in-the-loop tools should use the same approach with
`createHumanInTheLoop(...)`.

The local identity helpers should be thin TypeScript helpers. They should not
register anything and should not inject anything:

```ts
type WithoutAgentId<T> = Omit<T, 'agentId'> & {
  agentId?: never;
};

export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: WithoutAgentId<FrontendToolConfig<Args>>,
): WithoutAgentId<FrontendToolConfig<Args>> {
  return tool;
}
```

No additional mode parameter is planned. If a use case needs different
semantics, description, parameters, or behavior, it should get a separate tool
definition or explicit tool variant.

The generic `agentStore(...)` helper is responsible for creating an
`InjectionToken` whose factory adds the concrete `agentId` to every tool
definition:

```ts
for (const tool of config.frontendTools ?? []) {
  registerFrontendTool({ ...tool, agentId: config.agentId });
}

for (const toolCall of config.renderToolCalls ?? []) {
  registerRenderToolCall({ ...toolCall, agentId: config.agentId });
}

for (const tool of config.humanInTheLoop ?? []) {
  registerHumanInTheLoop({ ...tool, agentId: config.agentId });
}
```

Keep using `registerFrontendTool`, `registerRenderToolCall`, and
`registerHumanInTheLoop` instead of calling `copilotKit.addFrontendTool(...)`
directly. `registerFrontendTool` captures the current Angular `Injector`,
passes it to CopilotKit, and wires `DestroyRef` cleanup. The injector matters
because CopilotKit runs frontend tool handlers through that injection context,
so handlers can safely call Angular `inject(...)`.

## Agent store initialization

Each use case should expose an `InjectionToken` for its CopilotKit agent store.
The token factory initializes the self-managed AG-UI `HttpAgent` for the
existing `/ag-ui/:agentId` route, registers frontend tools, tool-call renderers,
human-in-the-loop tools, and activity renderers for the same `agentId`, and then
returns the app-facing agent store.

Shared CopilotKit code should use two layers:

- `src/app/domains/shared/util-copilotkit` is the base layer for generic
  CopilotKit helpers that should ideally come from `@copilotkit/angular`
  itself. This layer should not know flights-specific assistant details.
- `src/app/domains/shared/ui-assistant` is the app-specific assistant layer. It
  can build on `util-copilotkit` and contain flights assistant details such as
  MCP Apps rendering and assistant-shell integration.

Do not place new CopilotKit helpers in `libs/ag-ui-client`. That library is
legacy AG-UI client infrastructure; the new helpers are CopilotKit-native
infrastructure.

Use this split:

- `src/app/domains/shared/util-copilotkit/tool-definition.ts` for the pure
  TypeScript identity helpers `createFrontendTool(...)`,
  `createRenderToolCall(...)`, and `createHumanInTheLoop(...)`
- `src/app/domains/shared/util-copilotkit/agent-store.ts` for the public
  `agentStore(...)` token helper, the app-facing `CopilotAgentStore` type, and
  the private `createAgentStore(...)` implementation detail
- `src/app/domains/shared/ui-assistant/copilot/mcp-apps/...` for CopilotKit MCP
  Apps activity rendering and related assistant UI integration

Feature-specific agent store tokens and tool definitions stay in the owning
feature, for example `src/app/domains/ticketing/ai/ticketing-agent-store.ts`
and `src/app/domains/ticketing/ai/tools/find-flights.tool.ts`.

The preferred use-case token shape is:

```ts
export const TICKETING_AGENT_ID = 'ticketingAgent';

export const TicketingAgentStore = agentStore({
  agentId: TICKETING_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(TICKETING_AGENT_ID),
  frontendTools: [findFlightsTool, toggleFlightSelectionTool],
  renderToolCalls: [bookFlightRenderTool, cancelFlightRenderTool],
  humanInTheLoop: [requestApprovalTool],
});
```

Use PascalCase for concrete agent store tokens, for example
`TicketingAgentStore`, so consumers can treat them like class-like DI entries
at the injection site. Define `url` as a factory so runtime configuration can be
read through Angular `inject(...)` inside the token factory.

This replaces `agUiResource` in migrated use cases while keeping the existing
server routes.

Using `providedIn: 'root'` does not imply eager loading. If the token is only
referenced from a lazy feature, its code can still live in that lazy chunk. The
scope decision is about lifetime: `providedIn: 'root'` gives one store
initialization for the application, while route providers would give one per
route environment injector.

The public shared helper should be called `agentStore(...)`. It creates an
`InjectionToken<CopilotAgentStore>` and keeps the actual store creation inside
`util-copilotkit/agent-store.ts`. The internal implementation can still use a
private `createAgentStore(...)` function, but that function should not be
exported.

CopilotKit's native `injectAgentStore(agentId)` returns a `Signal<AgentStore>`.
`createAgentStore(...)` should keep that as an internal detail and return a
flat store object instead. The app code should name injected stores
`agentStore`, for example:

```ts
protected readonly agentStore = inject(TicketingAgentStore);
```

The app-facing API should expose signals as properties and convenience methods
as methods:

```ts
export interface CopilotAgentStore {
  messages: Signal<Message[]>;
  isRunning: Signal<boolean>;
  state: Signal<unknown>;
  sendMessage(message: string): Promise<void>;
}
```

This lets components use the store idiomatically:

```ts
await this.agentStore.sendMessage(message);
this.agentStore.messages();
this.agentStore.isRunning();
```

The initial `sendMessage(...)` helper is text-only. It trims empty input, adds a
user message to the underlying agent, and runs the agent through CopilotKit's
core so registered frontend tools and context participate in the run.

```ts
export function agentStore(
  config: AgentStoreConfig,
): InjectionToken<CopilotAgentStore> {
  return new InjectionToken<CopilotAgentStore>(`${config.agentId} AgentStore`, {
    providedIn: config.providedIn === undefined ? 'root' : config.providedIn,
    factory: () =>
      createAgentStore({
        ...config,
        url: config.url(),
      }),
  });
}

function createAgentStore(config: ResolvedAgentStoreConfig): CopilotAgentStore {
  const copilotKit = inject(CopilotKit);

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [config.agentId]: new HttpAgent({
        agentId: config.agentId,
        url: config.url,
      }),
    },
  });

  for (const tool of config.frontendTools ?? []) {
    registerFrontendTool({ ...tool, agentId: config.agentId });
  }

  for (const toolCall of config.renderToolCalls ?? []) {
    registerRenderToolCall({ ...toolCall, agentId: config.agentId });
  }

  for (const tool of config.humanInTheLoop ?? []) {
    registerHumanInTheLoop({ ...tool, agentId: config.agentId });
  }

  const nativeStore = injectAgentStore(config.agentId);

  return {
    messages: computed(() => nativeStore().messages()),
    isRunning: computed(() => nativeStore().isRunning()),
    state: computed(() => nativeStore().state()),
    sendMessage: async (message) => {
      const content = message.trim();

      if (!content) {
        return;
      }

      const agent = nativeStore().agent;

      agent.addMessage({
        id: randomUUID(),
        role: 'user',
        content,
      });

      await copilotKit.core.runAgent({ agent });
    },
  };
}
```

Do not add a custom `onDestroy` cleanup for the `HttpAgent`. If the route/use
case is initialized again, the agent entry for the same `agentId` is
overwritten. CopilotKit's own `DestroyRef` handling still owns the lifetime of
`registerFrontendTool`, `registerRenderToolCall`, and `registerHumanInTheLoop`
registrations.

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
4. Add the use-case store token, for example `TicketingAgentStore`, and define
   it through `agentStore(...)`.
5. Migrate one browser tool, for example `findFlights`, by keeping the tool
   definition in its own file and registering it through the use-case
   `agentStore(...)` call.
6. Migrate one action-card renderer, for example `bookFlightTool`, using the
   same constant-definition and store-registration pattern and updating the card
   component itself to the CopilotKit tool-call API.
7. Migrate MCP Apps rendering to a custom CopilotKit activity renderer.
8. Migrate one human-in-the-loop approval/options flow directly to
   `registerHumanInTheLoop`.
9. Revisit the assistant shell and decide whether direct store usage remains
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
