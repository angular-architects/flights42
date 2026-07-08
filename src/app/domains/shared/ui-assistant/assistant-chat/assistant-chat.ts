import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopilotChatMessageView } from '@copilotkit/angular';
import {
  AgUiChatResourceRef,
  type AgUiResumePayload,
} from '@internal/ag-ui-client';

import {
  AgentMode,
  AgentModeService,
} from '../../util-common/agent-mode-service';
import { injectAutoScroller } from '../../util-common/auto-scroll-controller';
import { type CopilotAgentStore } from '../../util-copilotkit/agent-store';
import { ChatMessages } from '../chat-messages/chat-messages';
import { ChatRegistry } from '../chat-registry';
import { CopilotInterrupts } from '../copilot/interrupts/copilot-interrupts';

const DEFAULT_GREETING = 'Hi! How can I help you?';

@Component({
  selector: 'app-assistant-chat',
  imports: [
    FormsModule,
    ChatMessages,
    CopilotChatMessageView,
    CopilotInterrupts,
  ],
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

  private autoScroller = injectAutoScroller({
    getContainer: () => this.messagesContainer()?.nativeElement ?? null,
    shouldScroll: () => this.panelVisible(),
  });

  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');
  protected readonly greeting = signal<string>(DEFAULT_GREETING);
  protected readonly showModeSelector = signal(true);
  protected readonly copilotAgentId = signal<string | undefined>(undefined);
  protected readonly effectiveCopilotAgentId = computed(
    () => this.copilotAgentId() ?? '',
  );

  protected chat: AgUiChatResourceRef | null = null;
  protected copilotAgentStore: CopilotAgentStore | null = null;

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.chat = chatInfo.chat ?? null;
      this.copilotAgentStore = chatInfo.agentStore ?? null;
      this.copilotAgentId.set(chatInfo.agentId);
      this.greeting.set(chatInfo.greeting ?? DEFAULT_GREETING);
      this.showModeSelector.set(chatInfo.showModeSelector ?? true);
    });

    this.chatRegistry.openRequested.subscribe(() => {
      if (!this.panelVisible()) {
        this.panelVisible.set(true);
        this.handlePanelOpened();
      }
    });
  }

  private handlePanelOpened(): void {
    this.autoScroller.connect();

    queueMicrotask(() => {
      this.autoScroller.scrollToBottom();
      this.composerInput()?.nativeElement.focus();
    });
  }

  private handlePanelClosed(): void {
    this.autoScroller.disconnect();
  }

  protected toggle() {
    this.panelVisible.update((visible) => !visible);

    if (this.panelVisible()) {
      this.handlePanelOpened();
      return;
    }

    this.handlePanelClosed();
  }

  protected submit() {
    const message = this.message();
    this.message.set('');

    if (this.copilotAgentStore) {
      void this.copilotAgentStore.sendMessage(message);
      return;
    }

    this.chat?.sendMessage({ role: 'user', content: message });
  }

  protected stop(): void {
    if (this.copilotAgentStore) {
      this.copilotAgentStore.stop();
      return;
    }

    this.chat?.stop();
  }

  protected resumeInterrupt(payload: AgUiResumePayload): void {
    if (this.copilotAgentStore) {
      void this.copilotAgentStore.resumeInterrupt(payload);
      return;
    }

    this.chat?.resumeInterrupt(payload);
  }

  protected setMode(mode: AgentMode): void {
    this.agentMode.mode.set(mode);
  }
}
