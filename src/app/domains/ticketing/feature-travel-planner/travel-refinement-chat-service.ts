import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  TRAVEL_REFINEMENT_AGENT_ID,
  TravelRefinementAgentStore,
} from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly store = inject(TravelRefinementAgentStore);

  public init(): void {
    this.chatRegistry.setChat(
      this.store,
      TRAVEL_REFINEMENT_AGENT_ID,
      'Do you want to refine your travel plan?',
      false,
    );
  }

  /**
   * Clears the current refinement conversation so a newly created plan starts
   * from a fresh session. Preferences are read live from the request store.
   */
  public reset(): void {
    this.store.reset();
  }
}
