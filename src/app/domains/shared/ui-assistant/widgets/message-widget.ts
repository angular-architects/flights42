import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

import { createFrontendTool } from '../../util-copilotkit/tool-definition';
import { VoiceService } from '../voice/voice-service';
import { WIDGET_ID } from './widget-id';

const messageWidgetSchema = z.object({
  text: z.string().describe('Markdown-formatted text to show to the user'),
});

type MessageWidgetArgs = z.infer<typeof messageWidgetSchema>;

@Component({
  selector: 'app-message-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `<markdown [data]="text()"></markdown>`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class MessageWidget implements ToolRenderer<MessageWidgetArgs> {
  readonly toolCall = input.required<AngularToolCall<MessageWidgetArgs>>();

  protected readonly text = computed(() => this.toolCall().args.text ?? '');

  private readonly voice = inject(VoiceService);
  private readonly widgetId = inject(WIDGET_ID, { optional: true });

  constructor() {
    // Read the widget's text aloud once it stops changing (widget args stream
    // in incrementally, so we debounce to avoid reading partial content).
    // De-duplication lives in the service, keyed by the stable widget id, so
    // re-created widgets don't repeat.
    effect((onCleanup) => {
      const text = this.text();
      if (!this.voice.readingEnabled()) {
        return;
      }

      const handle = setTimeout(() => {
        this.voice.readMessage(this.widgetId, text);
      }, 600);
      onCleanup(() => {
        clearTimeout(handle);
      });
    });
  }
}

export const messageWidget = createFrontendTool({
  name: 'messageWidget',
  description: `
    Renders a textual message to the user as Markdown.
    Call this to give your natural-language answer; it can be combined with
    other widget tools in the same turn (call it first).
  `,
  parameters: messageWidgetSchema,
  component: MessageWidget,
  followUp: false,
  handler: async () => ({ shown: true }),
});
