import { MessageProcessor } from '@a2ui/angular';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { agUiResource, createShowComponentsTool } from '@internal/ag-ui-client';

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

type Handlers = Record<string, (context: Record<string, unknown>) => void>;

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly router = inject(Router);
  private readonly flightStore = inject(FlightStore);
  private readonly processor = inject(MessageProcessor);
  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;

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

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanupChat());
  }

  public init(): void {
    this.chatStore.setChat(this.chat);

    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.registerHandlers({
      checkIn: (context) => this.handleCheckIn(context),
      selectFlight: (context) => this.handleSelect(context),
      submitAnswer: (context) => this.handleSubmitAnswer(context),
    });
  }

  private registerHandlers(handlers: Handlers) {
    this.processor.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ message, completion }) => {
        const action = message.userAction;
        if (action && handlers[action.name]) {
          const context = action.context ?? {};
          const handle = handlers[action.name];
          handle(context);
        }
        completion.next([]);
      });
  }

  private handleCheckIn(context: Record<string, unknown>): void {
    const flightId = context['flightId'] as number | undefined;
    if (flightId != null) {
      this.router.navigate(['/checkin', { ticketId: flightId }]);
    }
  }

  private handleSelect(context: Record<string, unknown>): void {
    const flightId = context['flightId'] as number | undefined;
    if (flightId != null) {
      this.flightStore.updateBasket(flightId, true);
    }
  }

  private handleSubmitAnswer(context: Record<string, unknown>): void {
    const answer = context['answer'];
    const trimmed = String(answer ?? '').trim();
    this.chat.sendMessage({ role: 'user', content: trimmed });
  }

  private cleanupChat(): void {
    this.chat.dispose();
    this.chatStore.clearChat();
    this.initialized = false;
  }
}
