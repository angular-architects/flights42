import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopilotKit, type Message } from '@copilotkit/angular';

import { CopilotActivity } from '../../domains/shared/util-copilotkit/activity/copilot-activity';
import {
  reset as resetChat,
  sendMessage,
} from '../../domains/shared/util-copilotkit/agent-store-helper';
import { examplePrompts } from './example-prompts';
import { injectGenerativeUiAgentStore } from './generative-ui-agent-store';
import { GenerativeUiPrefs } from './generative-ui-prefs';

type ActivityMessage = Extract<Message, { role: 'activity' }>;

interface GenerativeUiToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete';
}

@Component({
  selector: 'app-generative-ui',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CopilotActivity],
  templateUrl: './generative-ui.html',
  styleUrl: './generative-ui.css',
})
export class GenerativeUi {
  private readonly copilotKit = inject(CopilotKit);

  protected readonly chat = injectGenerativeUiAgentStore();
  protected readonly agentId = computed(() => this.chat().agent.agentId ?? '');
  protected readonly message = signal('');
  protected readonly preventCaching = inject(GenerativeUiPrefs).preventCaching;

  protected readonly activities = computed<ActivityMessage[]>(() =>
    this.chat().messages().filter(isActivityMessage),
  );

  protected readonly hasOutput = computed(() => this.activities().length > 0);

  protected readonly allToolCalls = computed<GenerativeUiToolCall[]>(() =>
    collectToolCalls(this.chat().messages()),
  );

  protected readonly currentStatus = computed<string>(() =>
    deriveCurrentStatus(this.allToolCalls(), this.chat().isRunning()),
  );

  protected readonly showToolDetails = signal(false);

  protected submit(): void {
    const content = this.message().trim();
    if (!content) {
      return;
    }
    resetChat(this.chat);
    this.showToolDetails.set(false);
    void sendMessage(this.copilotKit, this.chat, content);
  }

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    if (!prompt) {
      return;
    }
    this.message.set(prompt);
    this.submit();
  }

  protected reset(): void {
    resetChat(this.chat);
    this.showToolDetails.set(false);
    this.message.set('');
  }

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected formatToolArgs(args: unknown): string {
    return formatToolArgs(args);
  }
}

function isActivityMessage(message: Message): message is ActivityMessage {
  return message.role === 'activity';
}

function collectToolCalls(
  messages: readonly Message[],
): GenerativeUiToolCall[] {
  const resolved = new Set<string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      resolved.add(message.toolCallId);
    }
  }

  const calls: GenerativeUiToolCall[] = [];
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

function deriveCurrentStatus(
  toolCalls: readonly GenerativeUiToolCall[],
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

function parseToolArguments(args: string): unknown {
  try {
    return JSON.parse(args);
  } catch {
    return args;
  }
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
