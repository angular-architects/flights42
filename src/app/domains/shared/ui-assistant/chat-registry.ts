import { Injectable } from '@angular/core';
import { AgUiChatResourceRef } from '@internal/ag-ui-client';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ChatInfo {
  chat: AgUiChatResourceRef | null;
  /** Greeting shown as the first assistant message. Undefined = component default. */
  greeting?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private _chat: AgUiChatResourceRef | null = null;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({ chat: null });
  public readonly chatInfo = this._chatInfo.asObservable();

  private readonly _openRequested = new Subject<void>();
  public readonly openRequested = this._openRequested.asObservable();

  public get chat(): AgUiChatResourceRef | null {
    return this._chat;
  }

  public setChat(chat: AgUiChatResourceRef, greeting?: string) {
    if (chat !== this._chat) {
      this._chat = chat;
      this._chatInfo.next({ chat, greeting });
    }
  }

  public clearChat(): void {
    this._chat = null;
    this._chatInfo.next({ chat: null });
  }

  /** Requests the assistant chat panel to open (e.g. after a plan was created). */
  public requestOpen(): void {
    this._openRequested.next();
  }
}
