import { MessageProcessor } from '@a2ui/angular';
import type { UserAction as A2UiUserAction } from '@a2ui/web_core/types/client-event';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { agUiResource, createShowComponentsTool } from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';
import { flightWidget } from './widgets/flight-widget';

interface CheckInActionContext {
  flightId: number;
}

type Handlers = Record<string, (action: A2UiUserAction) => void>;

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly router = inject(Router);
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
      checkIn: (action) => this.handleCheckIn(action),
      submitAnswer: (action) => this.handleSubmitAnswer(action),
    });
  }

  private registerHandlers(handlers: Handlers) {
    this.processor.events
      .pipe(takeUntilDestroyed())
      .subscribe(({ message, completion }) => {
        const action = message.userAction;
        if (action && handlers[action.name]) {
          const handle = handlers[action.name];
          handle(action);
        }
        completion.next([]);
      });
  }

  private handleCheckIn(action: A2UiUserAction): void {
    const context = action.context as unknown as CheckInActionContext;
    this.router.navigate(['/checkin', { ticketId: context.flightId }]);
  }

  private handleSubmitAnswer(action: A2UiUserAction): void {
    const context = action.context as Record<string, string>;
    console.log('submit context', JSON.stringify(context, null, 2));

    this.chat.sendMessage({
      role: 'user',
      content: JSON.stringify({
        type: 'a2ui_form_response',
        schemaVersion: 1,
        hideInternal: true,
        surfaceId: action.surfaceId,
        context,
      }),
    });
  }

  private cleanupChat(): void {
    this.chat.dispose();
    this.chatStore.clearChat();
    this.initialized = false;
  }
}
