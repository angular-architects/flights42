import { Injectable, signal } from '@angular/core';

export type AgentMode = 'plan' | 'execution';

@Injectable({ providedIn: 'root' })
export class AgentModeService {
  private readonly _mode = signal<AgentMode>('execution');
  readonly mode = this._mode.asReadonly();

  setMode(mode: AgentMode): void {
    this._mode.set(mode);
  }
}
