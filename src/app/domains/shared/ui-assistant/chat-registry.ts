import { Injectable } from '@angular/core';
import { UiChatResourceRef } from '@hashbrownai/angular';
import { Chat } from '@hashbrownai/core';
import { Subject } from 'rxjs';

export interface ChatInfo {
  chat: UiChatResourceRef<Chat.AnyTool> | null;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private chat: UiChatResourceRef<Chat.AnyTool> | null = null;
  private _chatInfo = new Subject<ChatInfo>();
  public chatInfo = this._chatInfo.asObservable();

  public setChat(chat: UiChatResourceRef<Chat.AnyTool>) {
    if (chat !== this.chat) {
      this._chatInfo.next({ chat });
    }
  }

  public clearChat(): void {
    this._chatInfo.next({ chat: null });
  }
}
