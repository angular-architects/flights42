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

/**
 * Derives the 3-node pipeline from the rendered widgets. CopilotKit's headless
 * store does not surface the server's STEP_STARTED/STEP_FINISHED events, so
 * progress is inferred from which widgets have appeared plus the run state.
 */
export function buildPipeline(
  flightsReady: boolean,
  hotelsReady: boolean,
  isLoading: boolean,
  hasWidgets: boolean,
): PipelineStep[] {
  const context: PipelineStateContext = {
    flightsReady,
    hotelsReady,
    isLoading,
    hasWidgets,
  };

  return PIPELINE_STEPS.map(({ id, label }) => ({
    id,
    label,
    state: resolvePipelineStepState(id, context),
  }));
}

interface PipelineStateContext {
  flightsReady: boolean;
  hotelsReady: boolean;
  isLoading: boolean;
  hasWidgets: boolean;
}

function resolvePipelineStepState(
  id: string,
  context: PipelineStateContext,
): PipelineStepState {
  const { flightsReady, hotelsReady, isLoading, hasWidgets } = context;
  const finished = !isLoading && hasWidgets;

  if (id === 'findFlights') {
    if (flightsReady || finished) {
      return 'done';
    }
    return isLoading ? 'active' : 'upcoming';
  }

  if (id === 'findHotels') {
    if (hotelsReady || finished) {
      return 'done';
    }
    return isLoading && flightsReady ? 'active' : 'upcoming';
  }

  // finalize
  if (finished) {
    return 'done';
  }
  return isLoading && flightsReady && hotelsReady ? 'active' : 'upcoming';
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
