import { type Interrupt } from '@ag-ui/core';
import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  type Signal,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type AgentStore, CopilotKit, type Message } from '@copilotkit/angular';

import {
  AgentMode,
  AgentModeService,
} from '../../util-common/agent-mode-service';
import {
  getAgentMessages,
  getPendingInterrupts,
  resumeInterrupt,
  sendMessage,
  stop,
} from '../../util-copilotkit/agent-store-helper';
import {
  ChatMessages,
  type ResumeInterruptEvent,
} from '../chat-messages/chat-messages';
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
  private copilotKit = inject(CopilotKit);

  protected mode = this.agentMode.mode;

  private composerInput =
    viewChild<ElementRef<HTMLInputElement>>('composerInput');
  private messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');
  protected readonly greeting = signal<string>(DEFAULT_GREETING);
  protected readonly showModeSelector = signal(true);

  protected readonly store = signal<Signal<AgentStore> | null>(null);
  protected readonly agentId = signal<string | null>(null);

  protected readonly messages = computed<Message[]>(() => {
    const store = this.store();
    const agentId = this.agentId();
    return store && agentId ? getAgentMessages(store, agentId) : [];
  });

  protected readonly interrupts = computed<Interrupt[]>(() => {
    const store = this.store();
    return store ? getPendingInterrupts(store) : [];
  });

  protected readonly isRunning = computed<boolean>(() => {
    const store = this.store();
    return store ? store().isRunning() : false;
  });

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.store.set(chatInfo.store);
      this.agentId.set(chatInfo.agentId);
      this.greeting.set(chatInfo.greeting ?? DEFAULT_GREETING);
      this.showModeSelector.set(chatInfo.showModeSelector ?? true);
    });

    this.chatRegistry.openRequested.subscribe(() => this.open());

    afterRenderEffect(() => {
      this.messages();
      this.interrupts();

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
    const store = this.store();
    if (store) {
      void sendMessage(this.copilotKit, store, message);
    }
  }

  protected stopRun(): void {
    const store = this.store();
    if (store) {
      stop(store);
    }
  }

  protected onResumeInterrupt(event: ResumeInterruptEvent): void {
    const store = this.store();
    if (store) {
      void resumeInterrupt(this.copilotKit, store, {
        [event.interruptId]: { status: 'resolved', payload: event.payload },
      });
    }
  }

  protected setMode(mode: AgentMode): void {
    this.agentMode.mode.set(mode);
  }
}
