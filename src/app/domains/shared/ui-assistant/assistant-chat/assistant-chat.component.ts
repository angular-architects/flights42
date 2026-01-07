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
  standalone: true,
  imports: [FormsModule, ChatMessages],
  templateUrl: './assistant-chat.component.html',
  styleUrls: ['./assistant-chat.component.css'],
})
export class AssistantChatComponent {
  chatRegistry = inject(ChatRegistry);

  composerInput = viewChild<ElementRef<HTMLInputElement>>('composerInput');
  messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  panelVisible = signal(false);
  message = signal('');

  chat: UiChatResourceRef<Chat.AnyTool> | null = null;

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

  toggle() {
    this.panelVisible.update((visible) => !visible);
    this.composerInput()?.nativeElement.focus();
  }

  submit() {
    const message = this.message();
    this.message.set('');
    this.chat?.sendMessage({ role: 'user', content: message });
  }
}
