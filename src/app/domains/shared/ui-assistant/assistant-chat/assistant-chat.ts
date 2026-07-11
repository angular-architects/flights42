import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AgentMode,
  AgentModeService,
} from '../../util-common/agent-mode-service';
import { type CopilotAgentStore } from '../../util-copilotkit/agent-store';
import { ChatMessages } from '../chat-messages/chat-messages';
import { ChatRegistry } from '../chat-registry';

const DEFAULT_GREETING = 'Hi! How can I help you?';

@Component({
  selector: 'app-assistant-chat',
  imports: [FormsModule, ChatMessages],
  templateUrl: './assistant-chat.html',
  styleUrls: ['./assistant-chat.css'],
})
export class AssistantChat {
  private chatRegistry = inject(ChatRegistry);
  private agentMode = inject(AgentModeService);

  protected mode = this.agentMode.mode;

  private composerInput =
    viewChild<ElementRef<HTMLInputElement>>('composerInput');
  private messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');
  protected readonly greeting = signal<string>(DEFAULT_GREETING);
  protected readonly showModeSelector = signal(true);

  protected readonly store = signal<CopilotAgentStore | null>(null);
  protected readonly agentId = signal<string | null>(null);

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.store.set(chatInfo.store);
      this.agentId.set(chatInfo.agentId);
      this.greeting.set(chatInfo.greeting ?? DEFAULT_GREETING);
      this.showModeSelector.set(chatInfo.showModeSelector ?? true);
    });

    this.chatRegistry.openRequested.subscribe(() => this.open());

    afterRenderEffect(() => {
      this.store()?.messages();

      if (!this.panelVisible()) {
        return;
      }

      this.scrollDown();
    });
  }

  private scrollDown() {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  protected toggle(): void {
    if (this.panelVisible()) {
      this.panelVisible.set(false);
      return;
    }

    this.open();
  }

  private open(): void {
    this.panelVisible.set(true);
    queueMicrotask(() => this.composerInput()?.nativeElement.focus());
  }

  protected submit() {
    const message = this.message();
    this.message.set('');
    void this.store()?.sendMessage(message);
  }

  protected stop(): void {
    this.store()?.stop();
  }

  protected setMode(mode: AgentMode): void {
    this.agentMode.mode.set(mode);
  }
}
