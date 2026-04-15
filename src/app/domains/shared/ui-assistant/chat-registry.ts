import { Injectable } from '@angular/core';
import { AgUiChatResourceRef } from '@internal/ag-ui-client';
import { BehaviorSubject } from 'rxjs';

export interface ChatInfo {
  chat: AgUiChatResourceRef | null;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private chat: AgUiChatResourceRef | null = null;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({ chat: null });
  public readonly chatInfo = this._chatInfo.asObservable();

  public setChat(chat: AgUiChatResourceRef) {
    if (chat !== this.chat) {
      this.chat = chat;
      this._chatInfo.next({ chat });
    }
  }

  public clearChat(): void {
    this.chat = null;
    this._chatInfo.next({ chat: null });
  }
}
