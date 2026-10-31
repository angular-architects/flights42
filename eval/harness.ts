import { type RunFinishedEvent } from '@ag-ui/client';
import { contentToText } from '@ag-ui/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  type AgentStore,
  CopilotKit,
  type Message,
  provideCopilotKit,
} from '@copilotkit/angular';

import { sendMessage } from '../src/app/domains/shared/util-copilotkit/agent-store-helper';

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface RunInfo {
  model?: string;
  failedToolCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface Turn {
  prompt: string;
  toolCalls: ToolCall[];
  text: string;
  runs: RunInfo[];
  errors: string[];
  durationMs: number;
}

export function setupTestBed(): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideCopilotKit({ enableInspector: false }),
      provideHttpClient(withFetch()),
      provideRouter([{ path: '**', children: [] }]),
    ],
  });
}

export function inContext<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

export function renderedToolNames(): Set<string> {
  const copilotKit = TestBed.inject(CopilotKit);
  return new Set(copilotKit.toolCallRenderConfigs().map((tool) => tool.name));
}

export function runTurn(
  store: Signal<AgentStore>,
  prompt: string,
  forwardedProps?: Record<string, unknown>,
): Promise<Turn> {
  const copilotKit = TestBed.inject(CopilotKit);
  return captureTurn(store, prompt, () =>
    sendMessage(copilotKit, store, prompt, forwardedProps),
  );
}

export async function captureTurn(
  store: Signal<AgentStore>,
  prompt: string,
  action: () => Promise<void>,
): Promise<Turn> {
  const agent = store().agent;
  const knownIds = new Set(agent.messages.map((message) => message.id));
  const runs: RunInfo[] = [];
  const errors: string[] = [];
  const subscription = agent.subscribe({
    onRunFinishedEvent: ({ event }) => {
      runs.push(toRunInfo(event));
    },
    onRunErrorEvent: ({ event }) => {
      errors.push(event.message);
    },
  });

  const started = Date.now();
  try {
    await action();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    subscription.unsubscribe();
  }

  const messages = (agent.messages as Message[]).filter(
    (message) => !knownIds.has(message.id),
  );
  return {
    prompt,
    ...toTrace(messages),
    runs,
    errors,
    durationMs: Date.now() - started,
  };
}

export async function waitUntil(
  condition: () => boolean,
  timeoutMs = 10_000,
): Promise<void> {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > timeoutMs) {
      return;
    }
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function toRunInfo(event: RunFinishedEvent): RunInfo {
  const result = (event.result ?? {}) as {
    model?: string;
    failedToolCalls?: number;
  };
  const usage = event.usage ?? [];
  return {
    model: result.model,
    failedToolCalls: result.failedToolCalls ?? 0,
    inputTokens: sum(usage.map((entry) => entry.inputTokens ?? 0)),
    outputTokens: sum(usage.map((entry) => entry.outputTokens ?? 0)),
  };
}

function toTrace(messages: Message[]): Pick<Turn, 'toolCalls' | 'text'> {
  const results = new Map<string, unknown>();
  for (const message of messages) {
    if (message.role === 'tool') {
      results.set(
        message.toolCallId,
        parseJson(contentToText(message.content)),
      );
    }
  }

  const toolCalls: ToolCall[] = [];
  const texts: string[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }
    const text = contentToText(message.content ?? '').trim();
    if (text) {
      texts.push(text);
    }
    for (const call of message.toolCalls ?? []) {
      const args = parseJson(call.function.arguments);
      toolCalls.push({
        name: call.function.name,
        args: isRecord(args) ? args : {},
        result: results.get(call.id),
      });
    }
  }
  return { toolCalls, text: texts.join('\n') };
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
