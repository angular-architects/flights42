import { Injectable } from '@angular/core';
import { AgUiChatResourceRef } from '@internal/ag-ui-client';
import { BehaviorSubject } from 'rxjs';

export interface ChatInfo {
  chat: AgUiChatResourceRef | null;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private _chat: AgUiChatResourceRef | null = null;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({ chat: null });
  public readonly chatInfo = this._chatInfo.asObservable();

  public get chat(): AgUiChatResourceRef | null {
    return this._chat;
  }

  public setChat(chat: AgUiChatResourceRef) {
    if (chat !== this._chat) {
      this._chat = chat;
      this._chatInfo.next({ chat });
    }
  }

  public clearChat(): void {
    this._chat = null;
    this._chatInfo.next({ chat: null });
  }
}
