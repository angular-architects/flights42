import { JsonPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  type AgUiActionWidget,
  AgUiChatMessage,
  AgUiInterrupt,
  WidgetContainerComponent,
} from '@internal/ag-ui-client';

import { MessageComponent } from '../message';
import { ToolStatusComponent } from '../tool-status';

@Component({
  selector: 'app-chat-messages',
  imports: [
    MatIconModule,
    JsonPipe,
    MatTooltipModule,
    WidgetContainerComponent,
    MessageComponent,
    ToolStatusComponent,
  ],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<AgUiChatMessage[]>();
  readonly interrupt = input<AgUiInterrupt | null>(null);
  readonly pending = input<boolean>(false);
  readonly resumeInterrupt = output<boolean>();
  protected readonly showIndicator = computed(() => this.pending());
  protected readonly interruptModel = computed(() =>
    toInterruptModel(this.interrupt()),
  );

  protected readonly icons = {
    user: '💬',
    assistant: '🤖',
    error: '⚡️',
  };

  private hasContent(message: AgUiChatMessage): boolean {
    const content = message.content as unknown;

    if (content == null) {
      return false;
    }

    if (typeof content === 'string') {
      return content.trim().length > 0;
    }

    if (
      typeof content === 'object' &&
      'ui' in content &&
      Array.isArray((content as { ui: unknown[] }).ui)
    ) {
      return (content as { ui: unknown[] }).ui.length > 0;
    }

    return true;
  }

  protected readonly messageModels = computed(() =>
    this.messages().map((message) => ({
      ...message,
      contentString:
        typeof message.content === 'string' ? message.content : String(''),
      hasContent: this.hasContent(message),
      icon: this.icons[message.role] || '❓',
      toolCalls: message.toolCalls.filter(
        (toolCall) => !hasActionWidget(message, toolCall.id),
      ),
    })),
  );
}

interface InterruptModel {
  id: AgUiInterrupt['id'];
  reason: AgUiInterrupt['reason'];
  message: string;
  args: unknown;
}

function toInterruptModel(
  interrupt: AgUiInterrupt | null,
): InterruptModel | null {
  if (!interrupt) {
    return null;
  }

  // `metadata` carries the Mastra bridge extras (kind, toolName, args,
  // suspendPayload); `message` is first-class on the AG-UI `Interrupt`.
  const metadata = interrupt.metadata ?? {};
  const toolName =
    typeof metadata['toolName'] === 'string' ? metadata['toolName'] : 'tool';

  return {
    id: interrupt.id,
    reason: interrupt.reason,
    message: interrupt.message ?? `Tool Call: ${toolName}`,
    args: metadata['args'],
  };
}

function hasActionWidget(
  message: AgUiChatMessage,
  toolCallId: string,
): boolean {
  return message.widgets.some(
    (widget): widget is AgUiActionWidget =>
      widget.kind === 'action' && widget.toolCallId === toolCallId,
  );
}
