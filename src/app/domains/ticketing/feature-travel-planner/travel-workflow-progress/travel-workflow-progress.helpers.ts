import { type Message } from '@copilotkit/angular';

import {
  BACKGROUND_TASK_ACTIVITY_TYPE,
  type BackgroundTaskContent,
  backgroundTaskContentSchema,
  type BackgroundTaskProgress,
} from '../../../shared/util-copilotkit/activity/background-task';

export const PIPELINE_STEPS = [
  { id: 'findFlights', label: 'Flights' },
  { id: 'findHotels', label: 'Hotels' },
  { id: 'finalize', label: 'Travel Plan' },
] as const;

export type PipelineStepState = 'upcoming' | 'active' | 'done';

export interface PipelineStep {
  id: string;
  label: string;
  state: PipelineStepState;
}

export interface WorkflowToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete';
}

/**
 * Tool calls the agent made, excluding the widget render tools (which are
 * UI-only and not interesting for the workflow detail list). The caller passes
 * the widget names in, derived from CopilotKit's registry via
 * `injectWidgetToolNames`.
 */
export function selectVisibleToolCalls(
  messages: readonly Message[],
  widgetToolNames: ReadonlySet<string>,
): WorkflowToolCall[] {
  const resolved = collectResolvedToolCallIds(messages);

  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.toolCalls ?? [])
    .filter((toolCall) => !widgetToolNames.has(toolCall.function.name))
    .map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      args: parseToolArguments(toolCall.function.arguments),
      status: resolved.has(toolCall.id) ? 'complete' : 'pending',
    }));
}

export function selectBackgroundTask(
  messages: readonly Message[],
): BackgroundTaskContent | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (
      message.role === 'activity' &&
      message.activityType === BACKGROUND_TASK_ACTIVITY_TYPE
    ) {
      const parsed = backgroundTaskContentSchema.safeParse(message.content);
      return parsed.success ? parsed.data : undefined;
    }
  }
  return undefined;
}

export function selectServiceCalls(
  progress: BackgroundTaskProgress,
): WorkflowToolCall[] {
  return progress.serviceCalls.map((call, index) => ({
    id: `${call.step}-${call.tool}-${index}`,
    name: `${call.tool} (${call.step})`,
    args: call.args,
    status: 'complete',
  }));
}

/** Ids of the tool calls whose result has already arrived. */
function collectResolvedToolCallIds(
  messages: readonly Message[],
): ReadonlySet<string> {
  return new Set(
    messages
      .filter((message) => message.role === 'tool')
      .map((message) => message.toolCallId),
  );
}

export function formatToolArgsValue(args: unknown): string | null {
  if (args === undefined || args === null) {
    return null;
  }
  const text = typeof args === 'string' ? args : safeStringify(args);
  return text.length > 0 ? text : null;
}

export function buildPipeline(
  startedSteps: ReadonlySet<string>,
  finishedSteps: ReadonlySet<string>,
  isLoading: boolean,
): PipelineStep[] {
  const context: PipelineStateContext = {
    startedSteps,
    finishedSteps,
    isLoading,
  };

  return PIPELINE_STEPS.map(({ id, label }, index) => ({
    id,
    label,
    state: resolvePipelineStepState(index, context),
  }));
}

interface PipelineStateContext {
  startedSteps: ReadonlySet<string>;
  finishedSteps: ReadonlySet<string>;
  isLoading: boolean;
}

function resolvePipelineStepState(
  index: number,
  context: PipelineStateContext,
): PipelineStepState {
  const { startedSteps, finishedSteps, isLoading } = context;

  if (!isLoading) {
    return 'done';
  }

  const isLast = index === PIPELINE_STEPS.length - 1;
  const self = PIPELINE_STEPS[index].id;

  if (!isLast) {
    const next = PIPELINE_STEPS[index + 1].id;
    if (finishedSteps.has(self) || startedSteps.has(next)) {
      return 'done';
    }
  }

  const reachedByPrev =
    index === 0 || finishedSteps.has(PIPELINE_STEPS[index - 1].id);
  if (reachedByPrev || startedSteps.has(self)) {
    return 'active';
  }

  return 'upcoming';
}

function parseToolArguments(args: string): unknown {
  try {
    return JSON.parse(args);
  } catch {
    return args;
  }
}

function safeStringify(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}
