# Evaluating `@copilotkit/angular` for the flights client

## Short answer

`@copilotkit/angular` can replace a substantial part of the generic client-side
AG-UI plumbing in `libs/ag-ui-client`, but it is not a drop-in replacement for
the whole library.

The package is best understood as an Angular facade over CopilotKit Core and
AG-UI. It gives us supported Angular APIs for agent stores, chat UI, frontend
tools, tool-call rendering, human-in-the-loop tools, A2UI, and Open Generative
UI. In flights, however, `libs/ag-ui-client` also contains project-specific host
behavior: the `showComponents` component registry, MCP Apps rendering, Mastra
AG-UI interrupt/resume handling, workflow-step display, local turn orchestration,
message shaping, and the current assistant shell integration.

Recommendation: migrate incrementally. Use `@copilotkit/angular` for the common
tool and rendering model, but keep the flights-specific host behavior as
application code until the server/runtime contract has been adjusted.

## Current flights client responsibilities

The current `libs/ag-ui-client` is more than a small Angular wrapper. It owns:

- `agUiResource`, which wraps `@ag-ui/client` `HttpAgent` runs in Angular
  `resource`/signals and exposes `sendMessage`, `stop`, `reset`,
  `resumeInterrupt`, and `resendMessages`.
- Client tools via `defineAgUiTool`, including execution inside an Angular
  injection context.
- Component registration via `defineAgUiComponent`, `defineActionCard`, and
  `createShowComponentsTool`.
- Rendering of result widgets, action cards, A2UI surfaces, MCP Apps iframes,
  workflow steps, and raw tool-call status.
- A message model tailored to the flights assistant panel:
  `AgUiChatMessage`, `AgUiWidgetInstance`, `AgUiToolCall`, and
  `AgUiInterrupt`.
- Compatibility code for the current Mastra-backed AG-UI route, including local
  tool follow-up turns and interrupt resume payloads.

The package also connects with server-side code in `libs/ag-ui-server`, where
the custom Mastra bridge emits AG-UI events, MCP Apps activity snapshots,
workflow step events, and interrupt metadata.

## What `@copilotkit/angular` provides

The evaluated published package is `@copilotkit/angular@0.1.2`. Its peer
dependencies support Angular 19, 20, and 21, so it fits the flights Angular 21
baseline.

Relevant APIs:

- `provideCopilotKit(config)` for runtime, agents, tools, renderers, A2UI, and
  Open Generative UI configuration.
- `injectAgentStore(agentId)` for a headless AG-UI agent store with `messages`,
  `state`, `isRunning`, and the underlying agent.
- `<copilot-chat>` for a ready-made chat UI.
- `registerFrontendTool` for browser-executed tools with handlers.
- `registerRenderToolCall` for rendering existing tool calls.
- `registerHumanInTheLoop` for tools that pause until the user responds.
- `RenderToolCalls` / `<copilot-render-tool-calls>` for rendering tool-call
  components beneath assistant messages.
- `renderActivityMessages` and built-in A2UI activity/tool renderers.

One important consequence: using CopilotKit does not remove AG-UI from the
architecture. `@copilotkit/angular` itself depends on `@ag-ui/client` and
`@ag-ui/core`.

## Can `libs/ag-ui-client` be replaced?

Partially.

The generic pieces can move to CopilotKit:

| Current flights code                          | CopilotKit replacement                                            |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `defineAgUiTool` for browser tools            | `registerFrontendTool`                                            |
| Action-card rendering for server/client tools | `registerRenderToolCall` or `registerFrontendTool({ component })` |
| Simple custom chat message rendering          | `<copilot-chat>` or a headless UI around `injectAgentStore`       |
| Tool-call renderer selection                  | `<copilot-render-tool-calls>`                                     |
| `showComponents` as model-callable UI tool    | `registerFrontendTool({ component, followUp: false })`            |
| Human approval as a client-side tool          | `registerHumanInTheLoop`                                          |
| A2UI tool/activity rendering                  | CopilotKit A2UI config and built-in renderers                     |

The flights-specific parts should not be deleted without replacements:

| Current flights capability          | Why it does not disappear                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| MCP Apps iframe host                | `@copilotkit/angular` has no native MCP Apps host.                                                                                         |
| `showComponents` registry internals | The tool call can move to `registerFrontendTool`, but the schema-driven Angular component registry and `captureProps` remain flights code. |
| AG-UI interrupt UI/resume wiring    | CopilotKit's AG-UI agent layer supports interrupt/resume, but the current flights approval UI and payload mapping still need to be wired.  |
| Workflow step visualization         | flights emits custom `STEP_STARTED` / `STEP_FINISHED` events and groups tool calls by `stepName`.                                          |
| Assistant shell API                 | The old `ChatRegistry` does not need to survive 1:1. The UI can read CopilotKit store primitives directly where practical.                 |
| MCP Apps server registry            | The server currently discovers `_meta.ui.resourceUri` and emits `activityType: "mcp-apps"`.                                                |
| A2UI catalog path                   | flights uses `@a2ui/angular/v0_9`; we should not build a compatibility adapter to CopilotKit's A2UI renderer.                              |

## Typical ticketing chat with CopilotKit

There are two realistic approaches.

### Option 1: use CopilotKit's chat UI

This is the shortest path if the team accepts CopilotKit's chat component and
styling model.

```html
<copilot-chat [agentId]="'ticketingAgent'"></copilot-chat>
```

This would replace most of `AssistantChat`, `ChatMessages`, and
`WidgetContainerComponent`, but it also means giving up some of the current
assistant shell behavior unless it is rebuilt through CopilotKit slots and
custom renderers.

### Option 2: keep the flights shell and use CopilotKit headlessly

This better matches the current application. The assistant panel can keep its
toggle, mode selector, auto-scroll behavior, and layout while the AG-UI run
state comes from CopilotKit.

The replacement does not have to preserve the current `ChatRegistry` shape.
What the frontend needs is direct access to a few headless primitives:

- send a user message
- iterate all messages
- read the current status, for example `isRunning` / `isLoading`
- inspect tool calls and tool results for rendering/status UI

CopilotKit already exposes these primitives through `injectAgentStore(agentId)`:
`store().agent`, `store().messages()`, `store().isRunning()`, and
`store().state()`. Tool calls are part of AG-UI assistant messages, while tool
results are separate `role: "tool"` messages.

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { CopilotKit, injectAgentStore } from '@copilotkit/angular';
import { randomUUID } from '@copilotkit/shared';

@Component({
  selector: 'app-ticketing-copilot-chat',
  template: `
    @for (message of messages(); track message.id) {
      @if (message.role === 'user') {
        <article class="msg user">{{ message.content }}</article>
      }

      @if (message.role === 'assistant') {
        <article class="msg assistant">
          @if (message.content) {
            <app-message [data]="message.content" />
          }

          <copilot-render-tool-calls
            [message]="message"
            [messages]="messages()"
            [isLoading]="store().isRunning()"
            [agentId]="'ticketingAgent'" />
        </article>
      }
    }

    <form (ngSubmit)="submit()">
      <input [value]="draft()" (input)="draft.set($any($event.target).value)" />
      <button type="submit" [disabled]="store().isRunning()">Send</button>
    </form>
  `,
})
export class TicketingCopilotChat {
  private readonly copilotKit = inject(CopilotKit);

  protected readonly store = injectAgentStore('ticketingAgent');
  protected readonly messages = computed(() => this.store().messages());
  protected readonly draft = signal('');

  protected async submit(): Promise<void> {
    const content = this.draft().trim();
    if (!content) {
      return;
    }

    const agent = this.store().agent;
    agent.addMessage({
      id: randomUUID(),
      role: 'user',
      content,
    });

    this.draft.set('');
    await this.copilotKit.core.runAgent({ agent });
  }
}
```

This replaces the `agUiResource` read/send loop. We should not introduce a new
project-level assistant facade for Option 2. The current flights message helpers
would need to be converted from `AgUiChatMessage[]` to AG-UI `Message[]` where
they are used.

## Ticketing tools

The current `findFlightsTool` can be expressed as a CopilotKit frontend tool.
The important difference is naming: CopilotKit uses `parameters` instead of the
current `schema`, and the handler receives a CopilotKit handler context.

```ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  registerFrontendTool,
  registerRenderToolCall,
} from '@copilotkit/angular';
import { z } from 'zod';

import { FlightStore } from '../data/flight-store';
import { BookFlightToolCallRenderer } from './book-flight-tool-call-renderer';

@Injectable({ providedIn: 'root' })
export class TicketingCopilotTools {
  private readonly flightStore = inject(FlightStore);
  private readonly router = inject(Router);

  constructor() {
    registerFrontendTool({
      agentId: 'ticketingAgent',
      name: 'findFlights',
      description: [
        'Searches for flights and redirects the user to the result page.',
        'Use city names, not airport codes.',
      ].join('\n'),
      parameters: z.object({
        from: z.string().describe('Departure city'),
        to: z.string().describe('Destination city'),
      }),
      handler: async ({ from, to }) => {
        this.flightStore.updateFilter(from, to);
        await this.router.navigate(['/ticketing/booking/flight-search']);
        return { ok: true };
      },
    });

    registerFrontendTool({
      agentId: 'ticketingAgent',
      name: 'toggleFlightSelection',
      description: 'Selects or deselects a flight in the basket.',
      parameters: z.object({
        flightId: z.number().describe('Flight id'),
        selected: z.boolean().describe('Desired selection state'),
      }),
      handler: async ({ flightId, selected }) => {
        this.flightStore.updateBasket(flightId, selected);
        return { selected };
      },
    });

    registerRenderToolCall({
      agentId: 'ticketingAgent',
      name: 'bookFlightTool',
      args: z.object({
        flightId: z.number(),
      }),
      component: BookFlightToolCallRenderer,
    });
  }
}
```

Server-side tools such as `bookFlightTool` and `cancelFlightTool` can stay on the
Mastra agent. The client registers renderers for those tool calls instead of
executing them in the browser.

## Action cards

Existing action card components should be migrated to the CopilotKit API
directly. We should not keep a compatibility adapter that converts
CopilotKit's `AngularToolCall` shape back into the old `AgUiActionData` shape.

If an existing card currently expects `actionData`, its input contract should be
changed to `AngularToolCall` and the card should derive status, args, and result
from CopilotKit's tool-call model.

```ts
import { Component, computed, input } from '@angular/core';
import { AngularToolCall, ToolRenderer } from '@copilotkit/angular';

interface BookFlightArgs {
  flightId: number;
}

interface BookFlightResult {
  bookingId?: string;
  status?: string;
}

@Component({
  selector: 'app-book-flight-tool-call-renderer',
  template: `
    @let call = toolCall();

    <section class="action-card">
      <h3>Book flight</h3>

      @if (call.args.flightId !== undefined) {
        <p>Flight {{ call.args.flightId }}</p>
      }

      @if (call.status === 'complete') {
        <p>{{ resultLabel() }}</p>
      } @else {
        <p>{{ call.status }}</p>
      }
    </section>
  `,
})
export class BookFlightToolCallRenderer implements ToolRenderer<BookFlightArgs> {
  readonly toolCall = input.required<AngularToolCall<BookFlightArgs>>();

  protected readonly result = computed(() =>
    parseToolResult<BookFlightResult>(this.toolCall().result),
  );

  protected readonly resultLabel = computed(() => {
    const result = this.result();
    return result?.bookingId
      ? `Booking ${result.bookingId} created`
      : 'Booking finished';
  });
}

function parseToolResult<T>(result: string | undefined): T | undefined {
  if (!result) {
    return undefined;
  }
  try {
    return JSON.parse(result) as T;
  } catch {
    return undefined;
  }
}
```

This makes action cards a good migration candidate. The card UI and undo logic
remain flights code, but the input contract and lifecycle state should come
from CopilotKit.

## `showComponents` and registered Angular widgets

The current `createShowComponentsTool` is a flights-specific pattern. It lets
the model render one or more registered Angular widgets with schema-validated
props:

- `messageWidget`
- `flightWidget`
- `planWidget`
- `mcpAppsWidgetComponent`
- action cards

The `showComponents` tool itself can be replaced by `registerFrontendTool`.
That gives the model the same callable tool shape, and the `component` option
renders the completed tool call. What remains custom is the flights registry
behind it: mapping component names to Angular components, validating props, and
freezing live state via `captureProps`.

```ts
import { Component, Type, computed, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import {
  AngularToolCall,
  ToolRenderer,
  registerFrontendTool,
} from '@copilotkit/angular';
import { z } from 'zod';

const showComponentsSchema = z.object({
  components: z.array(
    z.discriminatedUnion('name', [
      z.object({
        name: z.literal('messageWidget'),
        props: z.object({ text: z.string() }),
      }),
      z.object({
        name: z.literal('flightWidget'),
        props: z.object({
          flight: z.object({
            id: z.number(),
            from: z.string(),
            to: z.string(),
            date: z.string(),
            delay: z.number(),
          }),
          status: z.enum(['booked', 'other', 'none']),
        }),
      }),
      z.object({
        name: z.literal('planWidget'),
        props: z.object({}),
      }),
    ]),
  ),
});

type ShowComponentsArgs = z.infer<typeof showComponentsSchema>;

interface WidgetInstance {
  id: string;
  component: Type<unknown>;
  props: Record<string, unknown>;
}

declare function toWidgetInstances(value: unknown): WidgetInstance[];

registerFrontendTool({
  agentId: 'ticketingAgent',
  name: 'showComponents',
  description: 'Render registered flights UI components in the chat.',
  parameters: showComponentsSchema,
  component: ShowComponentsRenderer,
  followUp: false,
  handler: async (args) => args,
});

@Component({
  selector: 'app-show-components-renderer',
  imports: [NgComponentOutlet],
  template: `
    @for (widget of widgets(); track widget.id) {
      <ng-container
        *ngComponentOutlet="widget.component; inputs: widget.props" />
    }
  `,
})
export class ShowComponentsRenderer implements ToolRenderer<ShowComponentsArgs> {
  readonly toolCall = input.required<AngularToolCall<ShowComponentsArgs>>();

  protected readonly widgets = computed(() =>
    // Project code keeps the registry mapping from component name to
    // Angular component and frozen props.
    toWidgetInstances(parseToolResult(this.toolCall().result)),
  );
}
```

This is conceptually close to the existing implementation. The low-risk path is
to replace the model-facing `showComponents` tool with `registerFrontendTool`,
but keep the registry implementation and `captureProps` for widgets such as
`planWidget`.

## MCP Apps

`@copilotkit/angular` has no native MCP Apps integration. The current flights
flow has two sides:

- Server side: `initMcpServer` discovers MCP tools and stores MCP Apps metadata
  from `_meta.ui.resourceUri`.
- Client side: `McpAppsWidgetComponent` loads the resource into an iframe,
  creates an `AppBridge`, sends tool input and tool result, handles sizing, and
  opens links.

The best integration point is a CopilotKit activity renderer if the server keeps
emitting `activityType: "mcp-apps"` snapshots.

```ts
import { Component, input } from '@angular/core';
import {
  ActivityRenderer,
  AngularActivityContentSchema,
  RenderActivityMessageConfig,
} from '@copilotkit/angular';
import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import {
  type AgUiMcpAppsSnapshotContent,
  McpAppsWidgetComponent,
} from '@internal/ag-ui-client';

export const mcpAppsContentSchema: AngularActivityContentSchema<AgUiMcpAppsSnapshotContent> =
  {
    safeParse: (content) =>
      isMcpAppsContent(content)
        ? { success: true, data: content }
        : { success: false },
  };

@Component({
  selector: 'app-mcp-apps-activity-renderer',
  imports: [McpAppsWidgetComponent],
  template: `<app-mcp-apps-widget [data]="content()" />`,
})
export class McpAppsActivityRenderer implements ActivityRenderer<AgUiMcpAppsSnapshotContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<AgUiMcpAppsSnapshotContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input<AbstractAgent | undefined>();
}

export const mcpAppsActivityRendererConfig: RenderActivityMessageConfig<AgUiMcpAppsSnapshotContent> =
  {
    activityType: 'mcp-apps',
    content: mcpAppsContentSchema,
    component: McpAppsActivityRenderer,
  };

function isMcpAppsContent(
  content: unknown,
): content is AgUiMcpAppsSnapshotContent {
  if (!content || typeof content !== 'object') {
    return false;
  }

  const value = content as Partial<AgUiMcpAppsSnapshotContent>;
  return (
    typeof value.serverId === 'string' &&
    typeof value.resourceUri === 'string' &&
    typeof value.toolInput === 'object' &&
    !!value.result &&
    typeof value.result === 'object' &&
    Array.isArray((value.result as { content?: unknown }).content)
  );
}
```

Then register it:

```ts
provideCopilotKit({
  runtimeUrl: 'http://localhost:3001/ai/runtime',
  renderActivityMessages: [mcpAppsActivityRendererConfig],
});
```

If MCP Apps should be initiated from the browser rather than from a server-side
MCP tool result, a `registerFrontendTool` wrapper can be built. For the current
flights architecture, activity rendering is the more direct mapping.

## Human-in-the-loop

For simple client-side approvals, CopilotKit's `registerHumanInTheLoop` is a
good fit.

```ts
import { Component, input } from '@angular/core';
import {
  HumanInTheLoopToolCall,
  HumanInTheLoopToolRenderer,
  registerHumanInTheLoop,
} from '@copilotkit/angular';
import { z } from 'zod';

const approvalSchema = z.object({
  message: z.string(),
  flightId: z.number().optional(),
});

type ApprovalArgs = z.infer<typeof approvalSchema>;

registerHumanInTheLoop({
  agentId: 'ticketingAgent',
  name: 'requestApproval',
  description: 'Ask the user to approve or reject an action.',
  parameters: approvalSchema,
  component: ApprovalRenderer,
});

@Component({
  selector: 'app-approval-renderer',
  template: `
    @let call = toolCall();

    <strong>Approval needed</strong>
    <p>{{ call.args.message }}</p>

    @if (call.status !== 'complete') {
      <button type="button" (click)="call.respond({ approved: false })">
        Reject
      </button>
      <button type="button" (click)="call.respond({ approved: true })">
        Approve
      </button>
    }
  `,
})
export class ApprovalRenderer implements HumanInTheLoopToolRenderer<ApprovalArgs> {
  readonly toolCall = input.required<HumanInTheLoopToolCall<ApprovalArgs>>();
}
```

This is separate from the AG-UI interrupt/resume protocol. In AG-UI 0.0.57,
which `@copilotkit/angular@0.1.2` uses, `RunAgentParameters` has
`resume?: ResumeEntry[]`, `RUN_FINISHED` can carry `outcome: "interrupt"` with
`interrupts`, `AbstractAgent` exposes `pendingInterrupts`, and
`buildResumeArray(...)` builds the resume payload.

So yes: CopilotKit can participate in the AG-UI interrupt standard through its
underlying AG-UI agent layer. What is still flights-specific is the UI and
payload mapping. Today the flights assistant panel exposes
`resumeInterrupt(payload)`. With CopilotKit headless UI, we would map the
current approval/options UI to the AG-UI shape:

```ts
import type { AbstractAgent } from '@ag-ui/client';
import { buildResumeArray } from '@ag-ui/client';

async function resumeAgent(
  agent: AbstractAgent,
  responses: Record<string, { status: 'resolved'; payload?: unknown }>,
) {
  await agent.runAgent({
    resume: buildResumeArray(agent.pendingInterrupts, responses),
  });
}
```

Decision for flights: convert client-side approval/options flows directly to
CopilotKit, especially `registerHumanInTheLoop`, and do not keep a
compatibility adapter back to the old client abstractions. Existing UI code can
be reused where useful, but its component inputs and response handling should be
changed to CopilotKit's human-in-the-loop API.

## A2UI

The plan note is correct: `@copilotkit/angular` includes A2UI integration.
However, it is not the same API as the current `provideA2uiCatalog` wrapper
around `@a2ui/angular/v0_9`.

Implications:

- Built-in CopilotKit A2UI rendering can replace some of
  `WidgetContainerComponent` and `A2uiRendererService` usage.
- Do not build a compatibility adapter from the current
  `@a2ui/angular/v0_9` catalog to CopilotKit's A2UI renderer. If equivalent UI
  behavior is needed, reshape the client code around CopilotKit-native frontend
  tools, render tools, messages, status, and tool-call APIs.
- Current A2UI action handlers such as `checkIn` and `submitAnswer` need to be
  wired to CopilotKit's A2UI action bridge or kept behind the existing
  `registerHandlers` approach until the catalog is migrated.

## Runtime consequences

The current Angular client talks directly to:

```text
http://localhost:3001/ag-ui/:agentId
```

CopilotKit examples often use a runtime endpoint such as:

```text
http://localhost:3001/api/copilotkit
```

That path is only a convention. In `@copilotkit/angular`, `runtimeUrl?: string`
is configurable, so flights can choose any route name, for example
`http://localhost:3001/ai/runtime`, as long as the server route and Angular
`runtimeUrl` match.

So a migration needs one of these runtime choices:

1. Add a CopilotKit runtime route on the server and expose the Mastra agents
   through that runtime.
2. Register self-managed/local AG-UI agents with CopilotKit and keep the
   existing `/ag-ui/:agentId` endpoint as the transport path during the spike.
3. Keep `agUiResource` for server communication at first, and use CopilotKit
   only for tool/rendering experiments.

The second or third option is safer for a first spike because the flights server
currently has custom behavior around memory, `forwardedProps.agentMode`,
thought-signature rehydration, workflow step events, MCP Apps snapshots, and
interrupt resume.

## Migration risks

- **AG-UI version alignment:** flights currently depends on `@ag-ui/client` and
  `@ag-ui/core` `0.0.52`; `@copilotkit/angular@0.1.2` depends on `0.0.57`.
  Check for duplicate installs and event-shape differences.
- **Message model changes:** existing UI expects `AgUiChatMessage[]`; CopilotKit
  exposes AG-UI `Message[]`.
- **Tool result parsing:** CopilotKit renderers receive `result` as a string on
  completed tool calls. Current action cards often expect structured results.
- **A2UI catalog migration:** the current Angular A2UI catalog is not the same
  type as CopilotKit's A2UI catalog.
- **Interrupt UX:** CopilotKit/AG-UI supports the interrupt/resume protocol,
  but flights still needs UI wiring for approval/options payloads when using a
  custom headless assistant shell.
- **MCP Apps:** must remain custom.
- **Assistant API:** preserving the current panel does not require preserving
  the old `ChatRegistry`; the UI can read `injectAgentStore` primitives
  directly where practical.

## Suggested migration path

1. Add `@copilotkit/angular` in a branch and align AG-UI versions.
2. Build a small ticketing spike using Option 2 without a project-level facade:
   keep the flights shell and bind it directly to
   `injectAgentStore('ticketingAgent')`, backed by the existing
   `/ag-ui/ticketingAgent` route during the spike if needed.
3. Migrate one client tool, for example `findFlights`, to
   `registerFrontendTool`.
4. Migrate one action card, for example `bookFlightTool`, to
   `registerRenderToolCall`.
5. Replace the model-facing `showComponents` tool with
   `registerFrontendTool`, while keeping its component registry as flights code;
   keep MCP Apps as a custom renderer.
6. Decide separately whether to migrate A2UI to CopilotKit's renderer or keep
   the current `@a2ui/angular/v0_9` path.
7. Only remove `libs/ag-ui-client` after all of these capabilities have direct
   replacements or new homes.

## Conclusion

`@copilotkit/angular` is a good candidate for reducing the amount of custom
generic AG-UI client code in flights. It should not be treated as a full
replacement for `libs/ag-ui-client` yet.

The most promising target is a hybrid:

- CopilotKit owns agent-store access, frontend tool registration, tool-call
  rendering, and possibly the chat UI.
- flights keeps project-specific host code for `showComponents`, MCP Apps,
  custom A2UI-related UI behavior, AG-UI interrupt UX, and workflow progress.

That migration would make the client more standard while preserving the parts
that are genuinely flights-specific.

## Sources checked

- Local flights docs: `docs/client-tools-and-components.md`
- Local flights client library: `libs/ag-ui-client`
- Local flights server bridge: `libs/ag-ui-server`
- Local ticketing chat: `src/app/domains/ticketing/ai/ticketing-chat-service.ts`
- npm package metadata and tarball for
  [`@copilotkit/angular@0.1.2`](https://www.npmjs.com/package/@copilotkit/angular)
- Official CopilotKit repository:
  [`packages/angular`](https://github.com/CopilotKit/CopilotKit/tree/main/packages/angular)
