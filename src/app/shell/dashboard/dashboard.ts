import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  type AgUiChatMessage,
  agUiResource,
  type AgUiToolCall,
  type AgUiWidget,
  WidgetContainerComponent,
} from '@internal/ag-ui-client';

import { ConfigService } from '../../domains/shared/util-common/config-service';
import { checkInAction } from '../../domains/ticketing/ai/actions/check-in-action';
import { registerHandlers } from '../../domains/ticketing/ai/register-handlers';
import { dashboardFlightSearchAction } from './actions/dashboard-flight-search-action';
import { examplePrompts } from './example-prompts';
import { submitFlightSearchTool } from './tools/submit-flight-search.tool';

interface ParsedA2uiSurface {
  surfaceId: string;
  messages: A2uiMessage[];
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, WidgetContainerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly config = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(A2uiRendererService);

  protected readonly message = signal('');
  protected readonly preventCaching = signal(false);

  protected readonly chat = agUiResource({
    url: this.config.agUiUrlFor('dashboardAgent'),
    model: this.config.model,
    useServerMemory: false,
    tools: [submitFlightSearchTool],
    forwardedProps: () => ({ preventCaching: this.preventCaching() }),
  });

  private readonly synthesizedWidgets = signal<Record<string, AgUiWidget>>({});

  protected readonly widgets = computed<AgUiWidget[]>(() =>
    collectWidgets(this.chat.value(), this.synthesizedWidgets()),
  );

  protected readonly hasOutput = computed(() =>
    hasOutput(this.widgets(), this.errorMessage()),
  );

  protected readonly errorMessage = computed<string | null>(() =>
    extractErrorMessage(this.chat.value()),
  );

  protected readonly allToolCalls = computed<AgUiToolCall[]>(() =>
    collectToolCalls(this.chat.value()),
  );

  protected readonly currentStatus = computed<string>(() =>
    deriveCurrentStatus(this.allToolCalls(), this.chat.isLoading()),
  );

  protected readonly showToolDetails = signal(false);

  constructor() {
    registerHandlers({
      checkIn: (action) => checkInAction(action),
      dashboardFlightSearch: (action) => dashboardFlightSearchAction(action),
    });

    effect(() => {
      this.absorbA2uiTextFallback(this.chat.value());
    });

    this.destroyRef.onDestroy(() => {
      this.chat.dispose();
    });
  }

  protected submit(): void {
    const content = this.message().trim();
    if (!content) {
      return;
    }
    this.clearRenderedSurfaces();
    this.chat.reset();
    this.synthesizedWidgets.set({});
    this.showToolDetails.set(false);
    this.chat.sendMessage({ role: 'user', content });
  }

  protected useExamplePrompt(index: number): void {
    const prompt = examplePrompts[index];
    if (!prompt) {
      return;
    }
    this.message.set(prompt);
    this.submit();
  }

  protected reset(): void {
    this.clearRenderedSurfaces();
    this.chat.reset();
    this.synthesizedWidgets.set({});
    this.showToolDetails.set(false);
    this.message.set('');
  }

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected formatToolArgs(args: unknown): string {
    return formatToolArgs(args);
  }

  private clearRenderedSurfaces(): void {
    const surfaceIds = Array.from(
      this.renderer.surfaceGroup.surfacesMap.keys(),
    );
    for (const id of surfaceIds) {
      this.renderer.surfaceGroup.deleteSurface(id);
    }
  }

  private absorbA2uiTextFallback(messages: AgUiChatMessage[]): void {
    const current = this.synthesizedWidgets();
    let next: Record<string, AgUiWidget> | null = null;

    for (const message of messages) {
      if (message.role !== 'assistant') {
        continue;
      }
      if (message.widgets.length > 0) {
        continue;
      }
      if (current[message.id]) {
        continue;
      }
      const surface = tryParseA2uiSurface(message.content);
      if (!surface) {
        continue;
      }

      this.renderer.processMessages(surface.messages);
      if (!this.renderer.surfaceGroup.getSurface(surface.surfaceId)) {
        continue;
      }

      next ??= { ...current };
      next[message.id] = {
        name: `a2ui_${message.id}`,
        a2uiSurfaceId: surface.surfaceId,
      };
    }

    if (next) {
      this.synthesizedWidgets.set(next);
    }
  }
}

function collectWidgets(
  messages: AgUiChatMessage[],
  synthesized: Record<string, AgUiWidget>,
): AgUiWidget[] {
  return messages.flatMap((message) => {
    if (message.role !== 'assistant') {
      return [];
    }
    if (message.widgets.length > 0) {
      return message.widgets;
    }
    const fallback = synthesized[message.id];
    return fallback ? [fallback] : [];
  });
}

function hasOutput(
  widgets: AgUiWidget[],
  errorMessage: string | null,
): boolean {
  return widgets.length > 0 || errorMessage !== null;
}

function extractErrorMessage(messages: AgUiChatMessage[]): string | null {
  const errorMessage = messages.find((message) => message.role === 'error');
  return errorMessage?.content ?? null;
}

function collectToolCalls(messages: AgUiChatMessage[]): AgUiToolCall[] {
  return messages.flatMap((message) =>
    message.role === 'assistant' ? message.toolCalls : [],
  );
}

function deriveCurrentStatus(
  toolCalls: AgUiToolCall[],
  isLoading: boolean,
): string {
  for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
    const toolCall = toolCalls[i];
    if (toolCall.status === 'pending' && toolCall.name) {
      return `Running tool: ${toolCall.name}`;
    }
  }
  return isLoading ? 'Thinking' : 'Ready';
}

function formatToolArgs(args: unknown): string {
  if (args === undefined || args === null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function tryParseA2uiSurface(content: string): ParsedA2uiSurface | null {
  if (!content || !content.includes('"messages"')) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('messages' in parsed) ||
    !Array.isArray((parsed as { messages?: unknown }).messages)
  ) {
    return null;
  }

  const list = (parsed as { messages: A2uiMessage[] }).messages;
  let surfaceId: string | null = null;
  for (const op of list) {
    if (op && typeof op === 'object' && 'createSurface' in op) {
      const value = (op as { createSurface?: { surfaceId?: string } })
        .createSurface;
      if (value?.surfaceId) {
        surfaceId = value.surfaceId;
        break;
      }
    }
  }

  if (!surfaceId) {
    return null;
  }

  return { surfaceId, messages: list };
}
