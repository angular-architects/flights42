import { z } from 'zod';

export const BACKGROUND_TASK_ACTIVITY_TYPE = 'mastra-background-task';

export const backgroundTaskStatusSchema = z.enum([
  'started',
  'running',
  'suspended',
  'resumed',
  'completed',
  'failed',
  'cancelled',
]);

export const backgroundTaskContentSchema = z
  .object({
    taskId: z.string(),
    toolName: z.string(),
    toolCallId: z.string().optional(),
    status: backgroundTaskStatusSchema,
    outputs: z.array(z.unknown()).default([]),
    result: z.unknown().optional(),
    error: z.string().optional(),
    elapsedMs: z.number().optional(),
  })
  .passthrough();

export type BackgroundTaskContent = z.infer<typeof backgroundTaskContentSchema>;
export type BackgroundTaskStatus = z.infer<typeof backgroundTaskStatusSchema>;

export interface BackgroundServiceCall {
  step: string;
  tool: string;
  args: unknown;
  result: unknown;
}

export interface BackgroundTaskProgress {
  status: BackgroundTaskStatus | undefined;
  startedSteps: ReadonlySet<string>;
  finishedSteps: ReadonlySet<string>;
  serviceCalls: readonly BackgroundServiceCall[];
}

export const EMPTY_BACKGROUND_TASK_PROGRESS: BackgroundTaskProgress = {
  status: undefined,
  startedSteps: new Set(),
  finishedSteps: new Set(),
  serviceCalls: [],
};

interface StreamChunk {
  type: string;
  payload?: unknown;
  data?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asChunk(value: unknown): StreamChunk | undefined {
  const record = asRecord(value);
  return record && typeof record['type'] === 'string'
    ? (record as unknown as StreamChunk)
    : undefined;
}

function unwrapOutput(output: unknown): StreamChunk | undefined {
  const record = asRecord(output);
  if (!record) {
    return undefined;
  }
  const chunk = asChunk(record);
  if (chunk?.type === 'tool-output') {
    return unwrapOutput(asRecord(chunk.payload)?.['output']) ?? chunk;
  }
  if (!chunk && record['output'] !== undefined) {
    return unwrapOutput(record['output']);
  }
  return chunk;
}

function isServiceCall(value: unknown): value is BackgroundServiceCall {
  const record = asRecord(value);
  return (
    record !== undefined &&
    typeof record['step'] === 'string' &&
    typeof record['tool'] === 'string'
  );
}

export function readBackgroundTaskProgress(
  content: BackgroundTaskContent | undefined,
): BackgroundTaskProgress {
  if (!content) {
    return EMPTY_BACKGROUND_TASK_PROGRESS;
  }

  const startedSteps = new Set<string>();
  const finishedSteps = new Set<string>();
  const serviceCalls: BackgroundServiceCall[] = [];

  for (const output of content.outputs) {
    const chunk = unwrapOutput(output);
    if (!chunk) {
      continue;
    }
    const stepId = asRecord(chunk.payload)?.['id'];
    if (chunk.type === 'workflow-step-start' && typeof stepId === 'string') {
      startedSteps.add(stepId);
    } else if (
      chunk.type === 'workflow-step-result' &&
      typeof stepId === 'string'
    ) {
      finishedSteps.add(stepId);
    } else if (
      chunk.type === 'data-service-call' &&
      isServiceCall(chunk.data)
    ) {
      serviceCalls.push(chunk.data);
    }
  }

  return { status: content.status, startedSteps, finishedSteps, serviceCalls };
}
