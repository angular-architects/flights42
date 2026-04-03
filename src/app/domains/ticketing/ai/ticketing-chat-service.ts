import { MessageProcessor } from '@a2ui/angular';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { agUiResource, createShowComponentsTool } from '@internal/ag-ui-client';
import { Subscription } from 'rxjs';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { FlightStore } from '../feature-booking/flight-search/flight-store';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';
import { flightWidget } from './widgets/flight-widget';

@Injectable({ providedIn: 'root' })
export class TicketingChatService implements OnDestroy {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly router = inject(Router);
  private readonly flightStore = inject(FlightStore);
  private readonly processor = inject(MessageProcessor);
  private initialized = false;
  private actionSubscription: Subscription | null = null;

  private readonly chat = agUiResource({
    url: this.config.agUiUrl,
    model: this.config.model,
    useServerMemory: true,
    tools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
      createShowComponentsTool([messageWidget, flightWidget]),
    ],
  });

  public init(): void {
    if (this.initialized) {
      this.chatStore.setChat(this.chat);
      return;
    }

    this.initialized = true;
    this.chatStore.setChat(this.chat);
    this.actionSubscription?.unsubscribe();
    this.actionSubscription = this.processor.events.subscribe(
      ({ message, completion }) => {
        const action = message.userAction;
        if (action) {
          const flightId = action.context?.['flightId'] as number | undefined;
          if (action.name === 'checkIn' && flightId != null) {
            this.router.navigate(['/checkin', { ticketId: flightId }]);
          } else if (action.name === 'select' && flightId != null) {
            this.flightStore.updateBasket(flightId, true);
          } else if (action.name === 'submitAnswer') {
            const answer =
              this.readActionAnswer(action.context) ??
              this.readSurfaceAnswer(action.surfaceId);
            if (answer) {
              this.chat.sendMessage({ role: 'user', content: answer });
            }
          }
        }
        completion.next([]);
      },
    );
  }

  public ngOnDestroy(): void {
    this.actionSubscription?.unsubscribe();
    this.actionSubscription = null;
    this.chat.stop();
    this.chat.reset();
    this.chatStore.clearChat();
    this.initialized = false;
  }

  private readActionAnswer(
    context: Record<string, unknown> | undefined,
  ): string | null {
    const answer = context?.['answer'];

    if (typeof answer === 'string') {
      const trimmed = answer.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof answer === 'number' || typeof answer === 'boolean') {
      return String(answer);
    }

    if (!answer || typeof answer !== 'object') {
      return null;
    }

    const asRecord = answer as Record<string, unknown>;
    const valueString = asRecord['valueString'];
    if (typeof valueString === 'string') {
      const trimmed = valueString.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    const literalString = asRecord['literalString'];
    if (typeof literalString === 'string') {
      const trimmed = literalString.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return null;
  }

  private readSurfaceAnswer(surfaceId: string | undefined): string | null {
    if (!surfaceId) {
      return null;
    }

    const surface = this.processor.getSurfaces().get(surfaceId);
    const value = surface?.dataModel.get('answer');
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
