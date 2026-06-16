import type {
  AgUiChatMessage,
  AgUiToolCall,
  AgUiWorkflowStep,
} from '@internal/ag-ui-client';

export const WORKFLOW_STEP_LABELS: Record<string, string> = {
  findFlights: 'Flights',
  findHotels: 'Hotels',
  finalize: 'Travel Plan',
};

export const PIPELINE_STEPS = [
  { id: 'findFlights', label: 'Flights' },
  { id: 'findHotels', label: 'Hotels' },
  { id: '_plan', label: 'Travel Plan' },
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

export function selectTopLevelToolCalls(
  toolCalls: AgUiToolCall[],
): AgUiToolCall[] {
  return toolCalls.filter(
    (toolCall) => !toolCall.stepName && !toolCall.name.startsWith('workflow-'),
  );
}

export function selectWorkflowSteps(
  messages: AgUiChatMessage[],
): AgUiWorkflowStep[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.workflowSteps);
}

export function groupToolCallsByStep(
  toolCalls: AgUiToolCall[],
): Map<string, AgUiToolCall[]> {
  const map = new Map<string, AgUiToolCall[]>();
  for (const toolCall of toolCalls) {
    const key = toolCall.stepName;
    if (!key) {
      continue;
    }
    const list = map.get(key);
    if (list) {
      list.push(toolCall);
    } else {
      map.set(key, [toolCall]);
    }
  }
  return map;
}

export function formatToolArgsValue(args: unknown): string {
  if (args === undefined || args === null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

export function readStepLabel(
  name: string,
  labels: Record<string, string>,
): string {
  return labels[name] ?? name;
}

export function buildPipeline(
  steps: AgUiWorkflowStep[],
  isLoading: boolean,
  hasWidgets: boolean,
): PipelineStep[] {
  const statusMap = new Map<string, string>();
  for (const step of steps) {
    statusMap.set(step.name, step.status);
  }

  const sequentialIds = ['findFlights', 'findHotels'];
  const allSequentialDone = sequentialIds.every(
    (id) => statusMap.get(id) === 'complete',
  );
  const firstIncomplete = sequentialIds.find(
    (id) => statusMap.get(id) !== 'complete',
  );
  const finalizeStarted =
    statusMap.has('finalize') || (allSequentialDone && isLoading);

  return PIPELINE_STEPS.map(({ id, label }) => {
    if (id === '_plan') {
      if (!isLoading && hasWidgets) return { id, label, state: 'done' };
      if (finalizeStarted) return { id, label, state: 'active' };
      return { id, label, state: 'upcoming' };
    }
    const status = statusMap.get(id);
    if (status === 'complete') return { id, label, state: 'done' };
    if (status === 'pending') return { id, label, state: 'active' };
    if (isLoading && id === firstIncomplete)
      return { id, label, state: 'active' };
    return { id, label, state: 'upcoming' };
  });
}
