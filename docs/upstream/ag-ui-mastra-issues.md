# Upstream issue drafts for `@ag-ui/mastra` (1.1.2) and `@ag-ui/a2ui-toolkit` (0.0.4)

Drafts written 2026-09-06 while executing
[stock-adapter-migration.md](../stock-adapter-migration.md). Repository:
`ag-ui-protocol/ag-ui` (`integrations/mastra/typescript`,
`sdks/typescript/packages/a2ui-toolkit`).

Filed upstream 2026-09-07: fixes as pull requests from the fork
`manfredsteyer/ag-ui` (local clone: `~/projects/trainings/ag-ui`),
design questions as issues:

| Draft | Filed as                                                           |
| ----- | ------------------------------------------------------------------ |
| 1     | PR [#2664](https://github.com/ag-ui-protocol/ag-ui/pull/2664)      |
| 2     | Issue [#2666](https://github.com/ag-ui-protocol/ag-ui/issues/2666) |
| 3     | PR [#2661](https://github.com/ag-ui-protocol/ag-ui/pull/2661)      |
| 4     | Issue [#2667](https://github.com/ag-ui-protocol/ag-ui/issues/2667) |
| 5     | Issue [#2668](https://github.com/ag-ui-protocol/ag-ui/issues/2668) |
| 6     | PR [#2662](https://github.com/ag-ui-protocol/ag-ui/pull/2662)      |
| 7     | PR [#2663](https://github.com/ag-ui-protocol/ag-ui/pull/2663)      |
| 8     | Issue [#2669](https://github.com/ag-ui-protocol/ag-ui/issues/2669) |

Drafts 2, 4, 5 and 8 need a design decision upstream and were filed as
issues on 2026-09-07 (not as PRs).

## 1. `tripwire` chunk is dropped — a guardrail abort ends as an empty success — PR #2664

`createChunkProcessor` has no case for Mastra's `tripwire` chunk (emitted when
an input/output processor aborts the run). The chunk hits the
`Unrecognized stream chunk type` warning, the stream closes, and the client
sees `RUN_STARTED … RUN_FINISHED` with no assistant output.

Proposal: map `tripwire` to a `TEXT_MESSAGE_*` sequence carrying either
`payload.reason` or a configurable `tripwireMessage: string | (reason) =>
string` on `MastraAgentConfig`, then finish the run normally. Alternative:
emit `RUN_ERROR` with `code: 'tripwire'`.

## 2. `reasoning-delta` is always routed to `REASONING_*` — Issue #2666

Some providers stream the visible answer as `reasoning-delta` (observed with
OpenAI reasoning models through Mastra's router). The adapter maps every
`reasoning-delta` to `REASONING_MESSAGE_CONTENT`, so the answer never becomes
assistant text.

Proposal: an opt-in `reasoningAsText: boolean` (or a predicate) that emits
`TEXT_MESSAGE_CHUNK` for `reasoning-delta` when no `text-delta` follows in the
same step.

## 3. `developer` messages are dropped by `convertAGUIMessagesToMastra` — PR #2661

AG-UI defines the `developer` role. The converter handles `assistant`, `user`
and `tool` only; a `developer` message is silently discarded, so a run that
consists of one developer message reaches Mastra with an empty message list
(`RUN_STARTED RUN_FINISHED`, no model call).

Proposal: map `developer` to a Mastra `user` message (or `system`, but `user`
matches how CopilotKit uses the role for app-injected context).

## 4. Resume path drops `clientTools`, `toolsets` and `untilIdle` — Issue #2667

`run()` resumes a suspended tool with
`agent.resumeStream(resume, { toolCallId, runId, memory, requestContext })`.
The initial path passes `clientTools` (from `input.tools`), the A2UI
`toolsets` and `untilIdle`; the resume path passes none of them. After the
resumed tool returns, the model no longer sees any frontend tool, so a
CopilotKit app whose agent answers exclusively through frontend tools gets a
run that ends after the tool result with no visible output.

Proposal: build the same option set for both paths (`clientTools`,
`toolsets`, `untilIdle`, `tracingOptions`, headers).

## 5. Suspended tool calls are invisible on the wire until resume — Issue #2668

For a tool that suspends, the buffered `TOOL_CALL_START/ARGS/END` are
suppressed by design; on resume the adapter emits a bare `TOOL_CALL_RESULT`
whose `toolCallId` never appeared as a tool call. CopilotKit's
`registerRenderToolCall` renderers therefore never render for suspendable
tools, and the orphan tool message is dropped client-side.

Proposal: either emit the `TOOL_CALL_*` triple on resume before the result,
or document that HITL rendering for suspendable Mastra tools must use the
interrupt payload instead of the tool call.

## 6. `selectNewMessages` warns on every first run of a thread — PR #2662

`memory.recall()` throws `No thread found with id …` for a thread that does
not exist yet; the adapter logs a `console.warn` and sends the full history.
The warning is expected noise on every new conversation.

Proposal: treat a missing thread as "no stored messages" without logging.

Local workaround until the PR ships: `ensureThread` in
`ai-server/src/mastra/routes/route-utils.ts` creates the thread (resource id =
thread id, matching the adapter's `resourceId`) before the run, so `recall()`
finds it. Remove once `@ag-ui/mastra` contains the fix.

## 7. Thread-scoped working memory cannot be seeded on a new thread — PR #2663

`syncInputStateToWorkingMemory` calls `memory.updateWorkingMemory()` before
the first `agent.stream()`. With `workingMemory.scope: 'thread'` Mastra
requires the thread to exist and fails with `Thread <id> not found`, so the
run errors before it starts. The remote path already handles this by creating
the thread; the local path does not.

Proposal: create the thread (or fall back to `scope: 'resource'` semantics)
before the first sync in the local path.

## 8. `a2ui-toolkit`: no data channel for `generate_a2ui` on `intent: 'create'` — Issue #2669

`prepareA2UIRequest` uses `changes` only for updates, and the Mastra adapter
strips the assistant message that carries the `generate_a2ui` tool call
before handing the conversation to the render subagent. Tool results are
filtered out as well. Data the main agent fetched in the same turn (a list of
booked flights) therefore never reaches the subagent; the surface renders an
empty list. Reproduced on `@ag-ui/mastra` 1.1.2 with `injectA2UITool: true`.

Proposal: render `changes` (or a new `content` argument) into the subagent
prompt for `create` as well, or keep the text of the stripped assistant
message.
