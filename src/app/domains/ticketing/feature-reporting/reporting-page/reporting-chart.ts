import { contentToText } from '@ag-ui/core';
import { type Message } from '@copilotkit/angular';
import { z } from 'zod';

export const EXECUTE_JAVASCRIPT_TOOL_NAME = 'executeJavaScript';

const reportingChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() })),
});

export type ReportingChart = z.infer<typeof reportingChartSchema>;

type AssistantMessage = Extract<Message, { role: 'assistant' }>;

export function selectChart(
  messages: readonly Message[],
): ReportingChart | undefined {
  const callIds = new Set(
    messages
      .flatMap((message) =>
        message.role === 'assistant' ? (message.toolCalls ?? []) : [],
      )
      .filter((call) => call.function.name === EXECUTE_JAVASCRIPT_TOOL_NAME)
      .map((call) => call.id),
  );

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === 'tool' && callIds.has(message.toolCallId)) {
      return parseChart(contentToText(message.content));
    }
  }
  return undefined;
}

export function selectChartMessage(
  messages: readonly Message[],
): AssistantMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'assistant') {
      continue;
    }
    const call = [...(message.toolCalls ?? [])]
      .reverse()
      .find(
        (candidate) => candidate.function.name === EXECUTE_JAVASCRIPT_TOOL_NAME,
      );
    if (call) {
      return { ...message, toolCalls: [call] };
    }
  }
  return undefined;
}

export function parseChart(
  content: string | undefined,
): ReportingChart | undefined {
  if (!content) {
    return undefined;
  }
  try {
    return reportingChartSchema.safeParse(JSON.parse(content)).data;
  } catch {
    return undefined;
  }
}

export function sameChart(
  a: ReportingChart | undefined,
  b: ReportingChart | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
