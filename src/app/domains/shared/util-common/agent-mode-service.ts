import { Injectable, signal } from '@angular/core';

export type AgentMode = 'plan' | 'execution';

@Injectable({ providedIn: 'root' })
export class AgentModeService {
  readonly mode = signal<AgentMode>('execution');
}
