import {
  type BaseEvent,
  EventType,
  randomUUID,
  type RunAgentInput,
} from '@ag-ui/client';
import { getExtendedLocalAgent } from '@internal/ag-ui-server';
import type { ContextWithMastra } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

import {
  computeGenerativeUiRequestHash,
  type GenerativeUiCacheEntry,
  readGenerativeUiCache,
  writeGenerativeUiCache,
} from '../cache/generative-ui-cache.js';
import {
  GENERATE_SANDBOXED_UI_TOOL_NAME,
  type SandboxedUiSpec,
  sandboxedUiSpecSchema,
} from '../generative-ui/sandboxed-ui-spec.js';
import {
  parseRunAgentInput,
  type SseWriter,
  streamAgentEvents,
} from './ag-ui-stream.js';

const GENERATIVE_UI_AGENT_ID = 'generativeUiAgent';
const OPEN_GENERATIVE_UI_ACTIVITY_TYPE = 'open-generative-ui';

const CACHED_FRAME_DELAY_MS = resolveCachedFrameDelayMs();

function resolveCachedFrameDelayMs(): number | null {
  if (process.env['NODE_ENV'] === 'production') {
    return null;
  }
  const raw = process.env['AG_UI_STREAM_FRAME_DELAY_MS'];
  if (raw === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export async function generativeUiAgUiRouteHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const mastraInstance = c.get('mastra');
  const requestContext = c.get('requestContext');

  const parsed = await parseRunAgentInput(c);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { input } = parsed;
  const preventCaching = isPreventCachingRequested(input);
  const cacheKey = computeGenerativeUiRequestHash(input.messages);

  if (!preventCaching) {
    const cached = await tryServeFromCache(c, cacheKey, input);
    if (cached) {
      return cached;
    }
  }

  const agent = getExtendedLocalAgent({
    mastra: mastraInstance,
    agentId: GENERATIVE_UI_AGENT_ID,
    resourceId: GENERATIVE_UI_AGENT_ID,
    requestContext,
  });

  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      let generateToolCallId: string | undefined;
      let argsBuffer = '';
      let capturedSpec: SandboxedUiSpec | undefined;

      await streamAgentEvents(sse, agent, input, {
        onEvent: (event): readonly BaseEvent[] | void => {
          const e = event as BaseEvent & {
            toolCallId?: string;
            toolCallName?: string;
            delta?: string;
          };

          if (
            e.type === EventType.TOOL_CALL_START &&
            e.toolCallName === GENERATE_SANDBOXED_UI_TOOL_NAME &&
            typeof e.toolCallId === 'string'
          ) {
            generateToolCallId = e.toolCallId;
            argsBuffer = '';
            return;
          }

          if (
            e.type === EventType.TOOL_CALL_ARGS &&
            e.toolCallId === generateToolCallId &&
            typeof e.delta === 'string'
          ) {
            argsBuffer += e.delta;
            return;
          }

          if (
            e.type === EventType.TOOL_CALL_END &&
            e.toolCallId === generateToolCallId
          ) {
            const { events, spec } = handleGenerateToolCallEnd(
              e.toolCallId ?? '',
              argsBuffer,
            );
            if (spec) {
              capturedSpec = spec;
            }
            return events;
          }
        },
      });

      if (capturedSpec && !preventCaching) {
        try {
          await writeGenerativeUiCache(cacheKey, capturedSpec);
        } catch (err) {
          console.error(
            `Failed to write generative UI cache (hash=${cacheKey}):`,
            err,
          );
        }
      }
    },
  );
}

async function streamCachedGenerativeUi(
  sse: SseWriter,
  input: RunAgentInput,
  spec: SandboxedUiSpec,
): Promise<void> {
  await emitFrame(sse, {
    type: EventType.RUN_STARTED,
    threadId: input.threadId,
    runId: input.runId,
  } as BaseEvent);

  const generateToolCallId = randomUUID();
  const generateParentMessageId = randomUUID();

  await emitFrame(sse, {
    type: EventType.TOOL_CALL_START,
    parentMessageId: generateParentMessageId,
    toolCallId: generateToolCallId,
    toolCallName: GENERATE_SANDBOXED_UI_TOOL_NAME,
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId: generateToolCallId,
    delta: JSON.stringify(spec),
  } as BaseEvent);
  await emitFrame(sse, {
    type: EventType.TOOL_CALL_END,
    toolCallId: generateToolCallId,
  } as BaseEvent);

  for (const event of buildSandboxedUiEvents(generateToolCallId, spec, true)) {
    await emitFrame(sse, event);
  }

  await emitFrame(sse, {
    type: EventType.RUN_FINISHED,
    threadId: input.threadId,
    runId: input.runId,
  } as BaseEvent);
}

// `generateSandboxedUi` is a client tool: without a TOOL_CALL_RESULT on the
// wire the frontend would run its handler after RUN_FINISHED and start a
// follow-up run.
function buildSandboxedUiEvents(
  toolCallId: string,
  spec: SandboxedUiSpec,
  cached: boolean,
): BaseEvent[] {
  return [
    {
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      content: JSON.stringify({ ok: true, cached }),
      messageId: randomUUID(),
      role: 'tool',
    } as unknown as BaseEvent,
    {
      type: EventType.ACTIVITY_SNAPSHOT,
      messageId: randomUUID(),
      activityType: OPEN_GENERATIVE_UI_ACTIVITY_TYPE,
      content: toActivityContent(spec),
    } as unknown as BaseEvent,
  ];
}

function toActivityContent(spec: SandboxedUiSpec): Record<string, unknown> {
  return {
    initialHeight: spec.initialHeight,
    generating: false,
    css: spec.css,
    cssComplete: true,
    html: [spec.html],
    htmlComplete: true,
    jsFunctions: spec.jsFunctions
      ? runAfterLoad(spec.jsFunctions)
      : spec.jsFunctions,
    jsFunctionsComplete: true,
    jsExpressions: spec.jsExpressions?.map(runAfterLoad),
    jsExpressionsComplete: true,
  };
}

// The sandbox executes injected code as soon as its handshake completes,
// which can be before CDN scripts (e.g. Three.js) are loaded and before the
// body is parsed. Deferring to the load event fixes that; the indirect
// `window.eval` keeps function declarations global across code blocks.
function runAfterLoad(code: string): string {
  return [
    '(function () {',
    `  var run = function () { window.eval(${JSON.stringify(code)}); };`,
    "  if (document.readyState === 'complete') {",
    '    run();',
    '  } else {',
    "    window.addEventListener('load', run);",
    '  }',
    '})();',
  ].join('\n');
}

function emit(sse: SseWriter, event: BaseEvent): Promise<void> {
  return sse.writeSSE({ data: JSON.stringify(event) });
}

async function emitFrame(sse: SseWriter, event: BaseEvent): Promise<void> {
  await emit(sse, event);
  if (CACHED_FRAME_DELAY_MS !== null) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, CACHED_FRAME_DELAY_MS),
    );
  }
}

function parseAccumulatedSpec(raw: string): SandboxedUiSpec | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = sandboxedUiSpecSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Invalid sandboxed UI spec:', result.error.issues);
    return null;
  }
  return result.data;
}

function isPreventCachingRequested(input: RunAgentInput): boolean {
  const props = input.forwardedProps;
  if (!props || typeof props !== 'object') {
    return false;
  }
  const value = (props as { preventCaching?: unknown }).preventCaching;
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.toLowerCase().trim();
    return normalised === '1' || normalised === 'true' || normalised === 'yes';
  }
  return false;
}

async function tryReadGenerativeUiCache(
  hash: string,
): Promise<GenerativeUiCacheEntry | null> {
  try {
    return await readGenerativeUiCache(hash);
  } catch (err) {
    console.error(`Failed to read generative UI cache (hash=${hash}):`, err);
    return null;
  }
}

async function tryServeFromCache(
  c: ContextWithMastra,
  cacheKey: string,
  input: RunAgentInput,
): Promise<Response | null> {
  const entry = await tryReadGenerativeUiCache(cacheKey);
  if (!entry) {
    return null;
  }
  // `c` is typed against @mastra/core's bundled hono, which is structurally
  // incompatible with the project's hono `Context` that `streamSSE` expects.
  return streamSSE(
    c as unknown as Parameters<typeof streamSSE>[0],
    async (sse) => {
      await streamCachedGenerativeUi(sse, input, entry.spec);
    },
  );
}

interface GenerateToolCallEndResult {
  events: readonly BaseEvent[];
  spec: SandboxedUiSpec | null;
}

function handleGenerateToolCallEnd(
  toolCallId: string,
  argsBuffer: string,
): GenerateToolCallEndResult {
  const spec = parseAccumulatedSpec(argsBuffer);
  if (!spec) {
    return {
      events: [
        makeRunError(
          `generateSandboxedUi received an invalid spec: ${truncate(argsBuffer)}`,
          'invalid_sandboxed_ui_spec',
        ),
      ],
      spec: null,
    };
  }
  return { events: buildSandboxedUiEvents(toolCallId, spec, false), spec };
}

function makeRunError(message: string, code: string): BaseEvent {
  return { type: 'RUN_ERROR', message, code } as unknown as BaseEvent;
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
