import {
  afterEveryRender,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiChatResourceRef } from '@hashbrownai/angular';
import { Chat } from '@hashbrownai/core';

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

  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');

  protected chat: UiChatResourceRef<Chat.AnyTool> | null = null;

  constructor() {
    this.chatRegistry.chatInfo.subscribe((chatInfo) => {
      this.chat = chatInfo.chat;
    });

    afterEveryRender(() => {
      if (this.panelVisible()) {
        this.scrollDown();
      }
    });
  }

  private scrollDown() {
    this.messagesContainer()?.nativeElement.scrollTo({
      top: this.messagesContainer()?.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  protected toggle() {
    this.panelVisible.update((visible) => !visible);
    this.composerInput()?.nativeElement.focus();
  }

  protected submit() {
    const message = this.message();
    this.message.set('');
    this.chat?.sendMessage({ role: 'user', content: message });
  }
}
