import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgUiChatResourceRef } from '@internal/ag-ui-client';

import { injectAutoScroller } from '../../util-common/auto-scroll-controller';
import { ChatMessages } from '../chat-messages/chat-messages';
import { ChatRegistry } from '../chat-registry';

@Component({
  selector: 'app-assistant-chat',
  imports: [FormsModule, ChatMessages],
  templateUrl: './assistant-chat.html',
  styleUrls: ['./assistant-chat.css'],
})
export class AssistantChat {
  private chatRegistry = inject(ChatRegistry);

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

  protected chat: AgUiChatResourceRef | null = null;

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.chat = chatInfo.chat;
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
    this.chat?.sendMessage({ role: 'user', content: message });
  }

  protected stop(): void {
    this.chat?.stop();
  }

  protected resumeInterrupt(approved: boolean): void {
    this.chat?.resumeInterrupt(approved);
  }
}
