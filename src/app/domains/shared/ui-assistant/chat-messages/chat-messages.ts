import { JsonPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RenderMessageComponent, UiChatMessage } from '@hashbrownai/angular';

import { MessageComponent } from '../message';
import { ToolStatusComponent } from '../tool-status';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    JsonPipe,
    MatTooltipModule,
    RenderMessageComponent,
    MessageComponent,
    ToolStatusComponent,
  ],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<UiChatMessage[]>();
  readonly pending = input<boolean>(false);
  protected readonly showIndicator = computed(
    () => this.pending() && this.messages().at(-1)?.role !== 'assistant',
  );

  protected readonly icons = {
    user: '💬',
    assistant: '🤖',
    error: '⚡️',
  };

  protected readonly messageModels = computed(() =>
    this.messages().map((message) => ({
      ...message,
      // content: String(message.content),
      contentString: String(message.content),
      icon: this.icons[message.role] || '❓',
      toolCalls: message.role === 'assistant' ? message.toolCalls : [],
    })),
  );
}
