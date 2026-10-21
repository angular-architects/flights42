import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopilotKit, type Message, RenderToolCalls } from '@copilotkit/angular';

import {
  reset,
  sendMessage,
} from '../../../shared/util-copilotkit/agent-store-helper';
import { examplePrompts } from './example-prompts';
import { renderChartToolCall } from './render-chart.tool';
import { injectReportingAgentStore } from './reporting-agent-store';

type AssistantMessage = Extract<Message, { role: 'assistant' }>;

interface ReportingToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete';
}

@Component({
  selector: 'app-reporting-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RenderToolCalls],
  templateUrl: './reporting-page.html',
  styleUrl: './reporting-page.css',
})
export class ReportingPage {
  protected readonly chat = injectReportingAgentStore();
  private readonly copilotKit = inject(CopilotKit);

  protected readonly message = signal('');

  protected readonly assistantMessage = computed<string>(() =>
    getAssistantMessage(this.chat().messages()),
  );

  protected readonly allToolCalls = computed<ReportingToolCall[]>(() =>
    collectToolCalls(this.chat().messages()),
  );

  protected readonly currentStatus = computed<string>(() =>
    getCurrentStatus(this.allToolCalls(), this.chat().isRunning()),
  );

  protected readonly errorMessage = computed<string | null>(() => null);

  protected readonly showToolDetails = signal(false);

  protected readonly latestJavaScriptCode = computed<string | null>(() =>
    getLatestJavaScriptCode(this.allToolCalls()),
  );

  protected readonly showCodeDetails = signal(false);

  protected readonly chartMessage = computed<AssistantMessage | null>(() =>
    getChartMessage(this.chat().messages()),
  );

  protected readonly formatToolArgs = formatToolArgs;
  protected readonly getJavaScriptCode = extractJavaScriptCodeFromToolCall;

  protected submit(): void {
    const content = this.message().trim();
    if (!content) {
      return;
    }
    this.showToolDetails.set(false);
    this.showCodeDetails.set(false);
    reset(this.chat);
    void sendMessage(this.copilotKit, this.chat, content);
  }

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected toggleCodeDetails(): void {
    this.showCodeDetails.update((value) => !value);
  }

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    if (!prompt) {
      return;
    }
    this.message.set(prompt);
    this.submit();
  }
}

function getAssistantMessage(messages: readonly Message[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      message.role === 'assistant' &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0
    ) {
      return message.content;
    }
  }
  return '';
}

function getChartMessage(
  messages: readonly Message[],
): AssistantMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      message.role === 'assistant' &&
      message.toolCalls?.some(
        (toolCall) => toolCall.function.name === renderChartToolCall.name,
      )
    ) {
      return message;
    }
  }
  return null;
}

function collectToolCalls(messages: readonly Message[]): ReportingToolCall[] {
  const resolved = new Set<string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      resolved.add(message.toolCallId);
    }
  }

  const calls: ReportingToolCall[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.toolCalls) {
      continue;
    }
    for (const toolCall of message.toolCalls) {
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

function getCurrentStatus(
  toolCalls: readonly ReportingToolCall[],
  isRunning: boolean,
): string {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const toolCall = toolCalls[i];
    if (toolCall.status === 'pending' && toolCall.name) {
      return `Running tool: ${toolCall.name}`;
    }
  }
  return isRunning ? 'Thinking' : 'Ready';
}

function getLatestJavaScriptCode(
  toolCalls: readonly ReportingToolCall[],
): string | null {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const code = extractJavaScriptCodeFromToolCall(toolCalls[i]);
    if (code) {
      return code;
    }
  }
  return null;
}

function formatToolArgs(args: unknown): string {
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

function extractJavaScriptCodeFromToolCall(
  toolCall: ReportingToolCall,
): string | null {
  const args = coerceArgsObject(toolCall.args);
  if (!args) {
    return null;
  }
  const code = (args as { code?: unknown }).code;
  if (typeof code === 'string' && code.length > 0) {
    return code;
  }
  return null;
}

function parseToolArguments(args: string): unknown {
  try {
    return JSON.parse(args);
  } catch {
    return args;
  }
}

function coerceArgsObject(args: unknown): Record<string, unknown> | null {
  if (args && typeof args === 'object') {
    return args as Record<string, unknown>;
  }
  if (typeof args === 'string' && args.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(args);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}
