import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { AG_UI_WIDGET_ID, defineAgUiComponent } from '@internal/ag-ui-client';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

import { VoiceService } from '../voice/voice-service';

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
export class MessageWidget {
  readonly text = input.required<string>();

  private readonly voice = inject(VoiceService);
  private readonly widgetId = inject(AG_UI_WIDGET_ID, { optional: true });

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

export const messageWidget = defineAgUiComponent({
  name: 'messageWidget',
  description: [
    'Textual message to the user rendered as Markdown.',
    'MUST be the FIRST component in every showComponents call.',
    'Use this to provide the natural-language answer before any other widget.',
  ].join('\n'),
  component: MessageWidget,
  schema: z.object({
    text: z.string().describe('Markdown-formatted text to show to the user'),
  }),
});
