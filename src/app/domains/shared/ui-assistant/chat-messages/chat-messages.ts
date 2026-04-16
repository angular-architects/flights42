import { JsonPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
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
    MatButtonModule,
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
      toolCalls: message.toolCalls,
    })),
  );
}

interface InterruptPayload {
  message?: string | undefined;
}

interface InterruptModel {
  id: AgUiInterrupt['id'];
  reason: AgUiInterrupt['reason'];
  payload: AgUiInterrupt['payload'];
  message: string;
}

function toInterruptModel(
  interrupt: AgUiInterrupt | null,
): InterruptModel | null {
  if (!interrupt) {
    return null;
  }

  const suspendPayload = interrupt.payload.suspendPayload as
    | InterruptPayload
    | undefined;

  return {
    ...interrupt,
    message:
      typeof suspendPayload?.message === 'string'
        ? suspendPayload.message
        : `Tool Call: ${interrupt.payload.toolName}`,
  };
}
