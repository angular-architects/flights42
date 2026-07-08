import { Injectable } from '@angular/core';
import { AgUiChatResourceRef } from '@internal/ag-ui-client';
import { BehaviorSubject, Subject } from 'rxjs';

import { CopilotAgentStore } from '../util-copilotkit/agent-store';

export interface ChatInfo {
  chat?: AgUiChatResourceRef | null;
  agentStore?: CopilotAgentStore | null;
  agentId?: string;
  greeting?: string;
  showModeSelector?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private _chat: AgUiChatResourceRef | null = null;
  private _agentStore: CopilotAgentStore | null = null;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({
    chat: null,
    agentStore: null,
  });
  public readonly chatInfo = this._chatInfo.asObservable();
  private readonly _openRequested = new Subject<void>();
  public readonly openRequested = this._openRequested.asObservable();

  public get chat(): AgUiChatResourceRef | null {
    return this._chat;
  }

  public get agentStore(): CopilotAgentStore | null {
    return this._agentStore;
  }

  public setChat(
    chat: AgUiChatResourceRef,
    greeting?: string,
    showModeSelector = true,
  ) {
    if (chat !== this._chat) {
      this._chat = chat;
      this._agentStore = null;
      this._chatInfo.next({
        chat,
        agentStore: null,
        greeting,
        showModeSelector,
      });
    }
  }

  public setAgentStore(
    agentStore: CopilotAgentStore,
    agentId: string,
    greeting?: string,
    showModeSelector = true,
  ): void {
    if (agentStore !== this._agentStore) {
      this._chat = null;
      this._agentStore = agentStore;
      this._chatInfo.next({
        chat: null,
        agentStore,
        agentId,
        greeting,
        showModeSelector,
      });
    }
  }

  public clearChat(): void {
    this._chat = null;
    this._agentStore = null;
    this._chatInfo.next({ chat: null, agentStore: null });
  }

  public requestOpen(): void {
    this._openRequested.next();
  }
}
