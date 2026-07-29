import { Injectable, type Signal } from '@angular/core';
import { type AgentStore } from '@copilotkit/angular';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ChatInfo {
  store: Signal<AgentStore> | undefined;
  /** Agent id backing the store; needed to render tool calls and activities. */
  agentId: string | undefined;
  /** Greeting shown as the first assistant message. Undefined = component default. */
  greeting?: string;
  showModeSelector?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private _store: Signal<AgentStore> | undefined = undefined;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({
    store: undefined,
    agentId: undefined,
  });
  public readonly chatInfo = this._chatInfo.asObservable();
  private readonly _openRequested = new Subject<void>();
  public readonly openRequested = this._openRequested.asObservable();

  public get store(): Signal<AgentStore> | undefined {
    return this._store;
  }

  public setChat(
    store: Signal<AgentStore>,
    greeting?: string,
    showModeSelector = true,
  ): void {
    if (store !== this._store) {
      this._store = store;
      const agentId = store().agent.agentId;
      this._chatInfo.next({ store, agentId, greeting, showModeSelector });
    }
  }

  public clearChat(): void {
    this._store = undefined;
    this._chatInfo.next({ store: undefined, agentId: undefined });
  }

  public requestOpen(): void {
    this._openRequested.next();
  }
}
