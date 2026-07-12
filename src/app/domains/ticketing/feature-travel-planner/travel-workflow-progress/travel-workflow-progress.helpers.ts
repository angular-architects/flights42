import { type Message } from '@copilotkit/angular';

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

/** Widget render tools are UI-only and not interesting for the detail list. */
const WIDGET_TOOL_NAMES = new Set([
  'messageWidget',
  'flightWidget',
  'hotelWidget',
  'planWidget',
]);

/**
 * Tool calls the agent made, excluding the widget render tools (which are
 * UI-only and not interesting for the workflow detail list).
 */
export function selectVisibleToolCalls(
  messages: readonly Message[],
): WorkflowToolCall[] {
  const resolved = new Set<string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      resolved.add(message.toolCallId);
    }
  }

  const calls: WorkflowToolCall[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.toolCalls) {
      continue;
    }
    for (const toolCall of message.toolCalls) {
      if (WIDGET_TOOL_NAMES.has(toolCall.function.name)) {
        continue;
      }
      calls.push({
        id: toolCall.id,
        name: toolCall.function.name,
        args: parseToolArguments(toolCall.function.arguments),
        status: resolved.has(toolCall.id) ? 'complete' : 'pending',
      });
    }
  }
  return calls;
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
