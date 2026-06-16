import type {
  AgUiChatMessage,
  AgUiToolCall,
  AgUiWorkflowStep,
  AgUiWorkflowStepStatus,
} from '@internal/ag-ui-client';

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

export function selectVisibleToolCalls(
  messages: AgUiChatMessage[],
): AgUiToolCall[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.toolCalls)
    .filter((toolCall) => toolCall.name !== 'showComponents');
}

export function selectWorkflowSteps(
  messages: AgUiChatMessage[],
): AgUiWorkflowStep[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.workflowSteps);
}

export function formatToolArgsValue(args: unknown): string | null {
  if (args === undefined || args === null) {
    return null;
  }
  const text = typeof args === 'string' ? args : safeStringify(args);
  return text.length > 0 ? text : null;
}

function safeStringify(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

export function buildPipeline(
  steps: AgUiWorkflowStep[],
  isLoading: boolean,
  hasWidgets: boolean,
): PipelineStep[] {
  const status = new Map(steps.map((step) => [step.name, step.status]));

  const activeDataStep = isLoading
    ? ['findFlights', 'findHotels'].find((id) => status.get(id) !== 'complete')
    : undefined;

  const finalizeActive =
    status.has('finalize') || (isLoading && !activeDataStep);

  const context: PipelineStateContext = {
    status,
    isLoading,
    hasWidgets,
    activeDataStep,
    finalizeActive,
  };

  return PIPELINE_STEPS.map(({ id, label }) => ({
    id,
    label,
    state: resolvePipelineStepState(id, context),
  }));
}

interface PipelineStateContext {
  status: Map<string, AgUiWorkflowStepStatus>;
  isLoading: boolean;
  hasWidgets: boolean;
  activeDataStep: string | undefined;
  finalizeActive: boolean;
}

function resolvePipelineStepState(
  id: string,
  context: PipelineStateContext,
): PipelineStepState {
  const { status, isLoading, hasWidgets, activeDataStep, finalizeActive } =
    context;

  if (id === 'finalize') {
    if (!isLoading && hasWidgets) {
      return 'done';
    }
    return finalizeActive ? 'active' : 'upcoming';
  }
  if (status.get(id) === 'complete') {
    return 'done';
  }
  if (status.get(id) === 'pending' || id === activeDataStep) {
    return 'active';
  }
  return 'upcoming';
}
