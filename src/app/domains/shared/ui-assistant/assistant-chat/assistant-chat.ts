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
  sendMessage,
  stop,
} from '../../util-copilotkit/agent-store-helper';
import { ChatMessages } from '../chat-messages/chat-messages';
import { ChatRegistry } from '../chat-registry';
import { VoiceService } from '../voice/voice-service';

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
  protected readonly voice = inject(VoiceService);

  protected mode = this.agentMode.mode;

  private composerInput =
    viewChild<ElementRef<HTMLInputElement>>('composerInput');
  private messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');
  protected readonly greeting = signal<string>(DEFAULT_GREETING);
  protected readonly showModeSelector = signal(true);

  private readonly storeSource = signal<Signal<AgentStore> | undefined>(
    undefined,
  );
  // injectAgentStore replaces the AgentStore when the agent is re-resolved, so unwrap reactively
  protected readonly store = computed(() => this.storeSource()?.());
  protected readonly agentId = signal<string | undefined>(undefined);

  protected readonly messages = computed<Message[]>(() => {
    const storeSource = this.storeSource();
    const agentId = this.agentId();
    return storeSource && agentId ? getAgentMessages(storeSource, agentId) : [];
  });

  protected readonly isRunning = computed<boolean>(
    () => this.store()?.isRunning() ?? false,
  );

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.storeSource.set(chatInfo.store);
      this.agentId.set(chatInfo.agentId);
      this.greeting.set(chatInfo.greeting ?? DEFAULT_GREETING);
      this.showModeSelector.set(chatInfo.showModeSelector ?? true);
    });

    this.chatRegistry.openRequested.subscribe(() => this.open());

    afterRenderEffect(() => {
      this.messages();
      this.isRunning();

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
    if (this.voice.dictating()) {
      this.voice.stopDictation();
    }
    const message = this.message();
    this.message.set('');
    const storeSource = this.storeSource();
    if (storeSource) {
      void sendMessage(this.copilotKit, storeSource, message);
    }
  }

  protected toggleDictation(): void {
    if (this.voice.dictating()) {
      this.voice.stopDictation();
      return;
    }
    this.voice.startDictation(this.message(), {
      onText: (text) => {
        this.message.set(text);
      },
      onSilence: () => {
        this.submit();
      },
    });
  }

  protected toggleReading(): void {
    this.voice.toggleReading();
  }

  protected setLanguage(language: string): void {
    this.voice.setLanguage(language);
  }

  protected stopRun(): void {
    const storeSource = this.storeSource();
    if (storeSource) {
      stop(storeSource);
    }
  }

  protected setMode(mode: AgentMode): void {
    this.chatRegistry.requestMode(mode);
  }
}
