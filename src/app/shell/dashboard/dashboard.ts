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

  protected readonly chat = agUiResource({
    url: this.config.agUiUrlFor('dashboardAgent'),
    model: this.config.model,
    useServerMemory: false,
    tools: [submitFlightSearchTool],
  });

  // Fallback for runs where the agent emitted the A2UI payload as plain
  // assistant text instead of calling `renderA2uiTool`. We parse the text and
  // feed it through the renderer so the dashboard still appears.
  private readonly synthesizedWidgets = signal<Record<string, AgUiWidget>>({});

  protected readonly widgets = computed<AgUiWidget[]>(() => {
    const messages = this.chat.value();
    const synthesized = this.synthesizedWidgets();
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
  });

  protected readonly hasOutput = computed(
    () => this.widgets().length > 0 || this.errorMessage() !== null,
  );

  protected readonly errorMessage = computed<string | null>(() => {
    const messages = this.chat.value();
    const errorMessage = messages.find((message) => message.role === 'error');
    return errorMessage?.content ?? null;
  });

  // All tool calls produced since the current run started, in the order they
  // were invoked. We rebuild this list every time the message stream changes
  // because `chat.reset()` (called from `submit()`/`reset()`) clears the
  // stream, so a fresh run starts from an empty list automatically.
  protected readonly allToolCalls = computed<AgUiToolCall[]>(() => {
    const messages = this.chat.value();
    return messages.flatMap((message) =>
      message.role === 'assistant' ? message.toolCalls : [],
    );
  });

  // Status indicator: while the agent is running, show the most recent
  // pending tool call so the user knows which tool is currently executing.
  // If a tool is being executed we name it; otherwise we fall back to
  // "Thinking ..." while loading and "Ready" once the run is finished.
  protected readonly currentStatus = computed<string>(() => {
    const toolCalls = this.allToolCalls();
    for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
      const toolCall = toolCalls[i];
      if (toolCall.status === 'pending' && toolCall.name) {
        return `Running tool: ${toolCall.name}`;
      }
    }
    return this.chat.isLoading() ? 'Thinking ...' : 'Ready';
  });

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

  // The renderer's SurfaceGroupModel holds surfaces across runs. When a new
  // generation re-uses the same `surfaceId` (or even just re-adds the same
  // component ids inside an already-known surface), the renderer throws
  // "already exists". Drop every previous surface before kicking off a new
  // generation so the next run starts from a clean slate.
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
      const surface = this.tryParseA2uiSurface(message.content);
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

  private tryParseA2uiSurface(content: string): ParsedA2uiSurface | null {
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
}
