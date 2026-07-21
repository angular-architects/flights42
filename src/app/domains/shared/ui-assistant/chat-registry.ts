import { Injectable, type Signal } from '@angular/core';
import { type AgentStore } from '@copilotkit/angular';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ChatInfo {
  store: Signal<AgentStore> | null;
  /** Agent id backing the store; needed to render tool calls and activities. */
  agentId: string | null;
  /** Greeting shown as the first assistant message. Undefined = component default. */
  greeting?: string;
  showModeSelector?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatRegistry {
  private _store: Signal<AgentStore> | null = null;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({
    store: null,
    agentId: null,
  });
  public readonly chatInfo = this._chatInfo.asObservable();
  private readonly _openRequested = new Subject<void>();
  public readonly openRequested = this._openRequested.asObservable();

  public get store(): Signal<AgentStore> | null {
    return this._store;
  }

  public setChat(
    store: Signal<AgentStore>,
    greeting?: string,
    showModeSelector = true,
  ): void {
    if (store !== this._store) {
      this._store = store;
      const agentId = store().agent.agentId ?? null;
      this._chatInfo.next({ store, agentId, greeting, showModeSelector });
    }
  }

  public clearChat(): void {
    this._store = null;
    this._chatInfo.next({ store: null, agentId: null });
  }

  public requestOpen(): void {
    this._openRequested.next();
  }
}
