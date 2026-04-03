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

interface UserActionPayload {
  context?: Record<string, unknown>;
  surfaceId?: string;
}

interface A2UiFormMeta {
  type: 'a2ui_form_response';
  schemaVersion: number;
  questions: { id: string; label: string }[];
}

type Handlers = Record<string, (action: UserActionPayload) => void>;

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
      checkIn: (action) => this.handleCheckIn(action),
      selectFlight: (action) => this.handleSelect(action),
      submitAnswer: (action) => this.handleSubmitAnswer(action),
    });
  }

  private registerHandlers(handlers: Handlers) {
    this.processor.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ message, completion }) => {
        const action = message.userAction;
        if (action && handlers[action.name]) {
          const handle = handlers[action.name];
          handle({
            context: action.context ?? {},
            surfaceId: action.surfaceId,
          });
        }
        completion.next([]);
      });
  }

  private handleCheckIn(action: UserActionPayload): void {
    const context = action.context ?? {};
    const flightId = context['flightId'] as number | undefined;
    if (flightId != null) {
      this.router.navigate(['/checkin', { ticketId: flightId }]);
    }
  }

  private handleSelect(action: UserActionPayload): void {
    const context = action.context ?? {};
    const flightId = context['flightId'] as number | undefined;
    if (flightId != null) {
      this.flightStore.updateBasket(flightId, true);
    }
  }

  private handleSubmitAnswer(action: UserActionPayload): void {
    const context = action.context ?? {};
    const formMeta = this.readFormMeta(context['a2uiFormMeta']);
    if (formMeta && action.surfaceId) {
      const answers = formMeta.questions.map((question) => ({
        id: question.id,
        question: question.label,
        value: this.readString(context[question.id]) ?? '',
      }));
      const hasAnyAnswer = answers.some((a) => a.value.length > 0);
      if (!hasAnyAnswer) {
        return;
      }
      this.chat.sendMessage({
        role: 'user',
        content: JSON.stringify({
          type: 'a2ui_form_response',
          schemaVersion: formMeta.schemaVersion ?? 1,
          hideInternal: true,
          surfaceId: action.surfaceId,
          answers,
        }),
      });
      return;
    }

    const answer = this.readString(context['answer']);
    const answerRelative = this.readString(context['answerRelative']);
    const surfaceAnswer = this.readSurfaceAnswer(action.surfaceId);
    const content = answer ?? answerRelative ?? surfaceAnswer;

    if (!content) {
      return;
    }

    this.chat.sendMessage({ role: 'user', content });
  }

  private readString(value: unknown): string | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const nested =
        record['valueString'] ?? record['literalString'] ?? record['value'];
      if (nested !== undefined) {
        return this.readString(nested);
      }
    }

    const trimmed = String(value ?? '').trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private readFormMeta(value: unknown): A2UiFormMeta | null {
    const text = this.readString(value);
    if (!text) {
      return null;
    }
    try {
      const parsed = JSON.parse(text) as Partial<A2UiFormMeta>;
      if (
        parsed.type !== 'a2ui_form_response' ||
        !Array.isArray(parsed.questions)
      ) {
        return null;
      }
      const questions = parsed.questions.filter(
        (question): question is { id: string; label: string } =>
          typeof question?.id === 'string' &&
          question.id.length > 0 &&
          typeof question?.label === 'string',
      );
      if (questions.length === 0) {
        return null;
      }
      return {
        type: 'a2ui_form_response',
        schemaVersion:
          typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
        questions,
      };
    } catch {
      return null;
    }
  }

  private readSurfaceValue(surfaceId: string, key: string): string | null {
    const rootNode = { dataContextPath: '/' };
    const value = this.processor.getData(
      rootNode as never,
      `/${key}`,
      surfaceId,
    );
    return this.readString(value);
  }

  private readSurfaceAnswer(surfaceId: string | undefined): string | null {
    if (!surfaceId) {
      return null;
    }
    return this.readSurfaceValue(surfaceId, 'answer');
  }

  private cleanupChat(): void {
    this.chat.dispose();
    this.chatStore.clearChat();
    this.initialized = false;
  }
}
