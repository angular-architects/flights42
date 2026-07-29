import { Injectable, type Signal } from '@angular/core';
import { type AgentStore, type InterruptController } from '@copilotkit/angular';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ChatConfig {
  store: Signal<AgentStore>;
  interrupts: InterruptController;
  /** Greeting shown as the first assistant message. Undefined = component default. */
  greeting?: string;
  showModeSelector?: boolean;
}

export interface ChatInfo extends Partial<ChatConfig> {
  /** Agent id backing the store; needed to render tool calls and activities. */
  agentId: string | undefined;
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

  public setChat(config: ChatConfig): void {
    if (config.store === this._store) {
      return;
    }

    this._store = config.store;
    this._chatInfo.next({
      ...config,
      agentId: config.store().agent.agentId,
    });
  }

  public clearChat(): void {
    this._store = undefined;
    this._chatInfo.next({ store: undefined, agentId: undefined });
  }

  public requestOpen(): void {
    this._openRequested.next();
  }
}
