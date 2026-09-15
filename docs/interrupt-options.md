# Interrupt options for `bookFlight` and `cancelFlight`

Decision record written 2026-09-15 and implemented the same day. This
document describes the agreed target shape and the reasoning behind it.

Related: [upstream/ag-ui-mastra-issues.md](upstream/ag-ui-mastra-issues.md)
(issue 5, suppressed tool-call events for suspended tools),
[copilot-migration.md](copilot-migration.md) (interrupt controller adoption).

## TL;DR

- The approval buttons in the chat (`Pay with credit card`, `Pay with bonus
miles`, `Cancel`, `Accept`, `Decline`) are defined by the tools on the server
  and reach the client through `interrupt.metadata.mastra.suspendPayload`.
- The option format itself is a project convention. The path through
  `metadata.mastra` is specific to the `@ag-ui/mastra` adapter.
- We keep this design. Deriving the options from the AG-UI `responseSchema` or
  from the tool name was evaluated and rejected, see below.
- The option shape is trimmed to `label` and `payload`. The fields `id` and
  `variant` are removed. The button loop tracks by `$index`.

## Wiring before the change

Both tools suspend with a payload that carries the question and the choices.
`bookFlight` in
[ai-server/src/mastra/tools/book-flight.ts](../ai-server/src/mastra/tools/book-flight.ts)
and `cancelFlight` in
[ai-server/src/mastra/tools/cancel-flight.ts](../ai-server/src/mastra/tools/cancel-flight.ts)
declare the same `suspendOptionSchema`:

```ts
const suspendOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()),
  variant: z.enum(['primary', 'default', 'danger']).optional(),
});
```

The client reads the payload in `toInterruptModel` in
[chat-messages.ts](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts)
and renders one button per option in
[chat-messages.html](../src/app/domains/shared/ui-assistant/chat-messages/chat-messages.html).

`payload` is the object that travels back as resume data when the user clicks:

1. The button calls `resolveInterrupt(interrupt.id, option.payload)`.
2. `AssistantChat.onResumeInterrupt` passes it to
   `InterruptController.resolve`, which makes it the `payload` of the AG-UI
   resume entry on the next request.
3. `resolveResumeCommand` in
   [route-utils.ts](../ai-server/src/mastra/routes/route-utils.ts) extracts it
   as `resumeData` and calls `agent.resumeStream`.
4. The tool receives it as `context.agent.resumeData`, validated by Mastra
   against the tool's `resumeSchema`.

Because of step 4, every `payload` must match the tool's `resumeSchema`:
`{ selection: 'creditCard' | 'miles' | 'cancel' }` for `bookFlight` and
`{ approved: boolean }` for `cancelFlight`.

## What is standard and what is adapter-specific

Verified against the installed versions `@ag-ui/core` 0.0.59, `@ag-ui/mastra`
1.1.4 and `@mastra/core` 1.63.2.

The AG-UI `Interrupt` type has the fields `id`, `reason`, `message?`,
`toolCallId?`, `responseSchema?`, `expiresAt?`, `metadata?` and
`subagentRunId?`. Inside `metadata`, AG-UI reserves only the key `agui`; every
other key is user space.

The adapter's `suspendToInterrupt` builds the interrupt as follows:

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| `id`             | `${runId}::${toolCallId}`                                                   |
| `reason`         | `mastra:tool_suspend`                                                       |
| `toolCallId`     | the suspended tool call                                                     |
| `responseSchema` | JSON Schema parsed from the tool's `resumeSchema`                           |
| `message`        | not set                                                                     |
| `metadata`       | `{ mastra: { type, toolName, suspendPayload, args, resumeSchema, runId } }` |

Mastra converts the Zod `resumeSchema` with
`standardSchemaToJSONSchema(toStandardSchema(resumeSchema), { io: 'input' })`
before it emits the `tool-call-suspended` chunk. For our two tools the
client receives:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "selection": { "type": "string", "enum": ["creditCard", "miles", "cancel"] }
  },
  "required": ["selection"],
  "additionalProperties": false
}
```

```json
{
  "type": "object",
  "properties": { "approved": { "type": "boolean" } },
  "required": ["approved"],
  "additionalProperties": false
}
```

CopilotKit's `InterruptController` exposes `responseSchema` on its
`interrupts()` signal, so the client could read it without touching
`metadata`.

One constraint shapes the whole decision: for a tool that suspends, the
adapter suppresses the buffered `TOOL_CALL_START/ARGS/END` events (upstream
issue 5, ag-ui-protocol/ag-ui#2668). At the time the interrupt is shown, the
tool call is not in the client's message store. AG-UI has no field for the
tool name on an interrupt, only `toolCallId`. The tool name is therefore
available only through `metadata.mastra.toolName`. `ResumedToolCallMiddleware`
in
[agent-middlewares.ts](../src/app/domains/shared/util-copilotkit/agent-middlewares.ts)
already depends on this to replay the tool-call events after resume.

## Alternatives considered

### A. Derive the options from `responseSchema`

Walk `properties` of the JSON Schema. A property with `enum` yields one button
per value with payload `{ [name]: value }`. A property with `type: 'boolean'`
yields `Accept` and `Decline`. Labels come from a fixed switch in the client
with the raw value as fallback.

- Only alternative that uses standard AG-UI fields exclusively.
- Uses `responseSchema` for its intended purpose.
- Requires JSON Schema reflection in the client and a label map keyed by raw
  enum values across all tools.
- The question text still needs `suspendPayload.message` or a client-side
  template, because the adapter does not set `message`.

### B. Switch on the tool name

A computed in the chat that maps `bookFlight` and `cancelFlight` to
hard-coded option lists, mirroring the per-tool action cards.

- Explicit and typed.
- Needs `metadata.mastra.toolName`, so it has the same adapter dependency as
  the current design.
- Every new human-in-the-loop tool needs client code.
- Enum values are duplicated between the server `resumeSchema` and the client
  switch.

### C. Keep server-driven options (chosen)

- The adapter dependency exists in any case; B and C share it, A avoids it at
  the cost of schema reflection.
- The tool knows the business options; the client stays a plain renderer. A
  new human-in-the-loop tool needs no client change. For a project that
  demonstrates agentic UI this is the more instructive direction.
- Matches the proposal in upstream issue 5: human-in-the-loop rendering for
  suspendable Mastra tools uses the interrupt payload.
- Fewest concepts to learn: one payload in, buttons out.

## Decision

Keep the server-driven options and trim the option shape to what is actually
used.

### Remove `variant`

The client never reads it. The `InterruptOption` interface in
`chat-messages.ts` has no such field, the template hard-codes
`btn btn-default`, and every option on the server sends `'default'`.

### Remove `id`

The only consumer is the track expression in the button loop:

```html
@for (option of interrupt.options; track option.id) {
```

No lookup, comparison or resume path uses it. The loop tracks by `$index`
instead:

```html
@for (option of interrupt.options; track $index) {
```

This is safe because the list is static per interrupt, is never sorted or
filtered, and the outer loop already tracks by `interrupt.id`, so a new
interrupt produces a fresh list anyway. Tracking by `label` was rejected: it
turns the label into an implicit uniqueness key that nothing enforces. The
ESLint configuration has no template rule that forbids `$index`.

### Target shape

Server, in both tools:

```ts
const suspendOptionSchema = z.object({
  label: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
```

```ts
options: [
  { label: 'Pay with credit card', payload: { selection: 'creditCard' } },
  { label: 'Pay with bonus miles', payload: { selection: 'miles' } },
  { label: 'Cancel', payload: { selection: 'cancel' } },
],
```

```ts
options: [
  { label: 'Accept', payload: { approved: true } },
  { label: 'Decline', payload: { approved: false } },
],
```

Client, in `chat-messages.ts`:

```ts
interface InterruptOption {
  label: string;
  payload: Record<string, unknown>;
}

const DEFAULT_INTERRUPT_OPTIONS: InterruptOption[] = [
  { label: 'Accept', payload: { approved: true } },
  { label: 'Decline', payload: { approved: false } },
];
```

### Files to touch

| File                                                                   | Change                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `ai-server/src/mastra/tools/book-flight.ts`                            | Drop `id` and `variant` from `suspendOptionSchema` and options   |
| `ai-server/src/mastra/tools/cancel-flight.ts`                          | Same                                                             |
| `src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts`   | Drop `id` from `InterruptOption` and `DEFAULT_INTERRUPT_OPTIONS` |
| `src/app/domains/shared/ui-assistant/chat-messages/chat-messages.html` | `track option.id` becomes `track $index`                         |

## Open, not decided

- `payload` is typed as `z.record(z.string(), z.unknown())`. Its fit with the
  tool's `resumeSchema` is convention only. Using the tool's `resumeSchema` as
  the `payload` type per tool would make a typo in `selection` or `approved`
  a compile error. One line per tool, no extra indirection.
- `suspendOptionSchema` is declared twice, once per tool. It could move to a
  shared module under `ai-server/src/mastra/tools`.
- The labels in the options duplicate `PAYMENT_METHOD_LABELS` in
  `book-flight-action-card.ts`. One labels buttons, the other labels a result.
  Accepted as is.
- The adapter does not map `suspendPayload.message` to the standard
  `message` field. Candidate for a further upstream note in
  [upstream/ag-ui-mastra-issues.md](upstream/ag-ui-mastra-issues.md).
