import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

import { defineWidget } from '../copilot/widget-tools/widget';

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
}

export const messageWidget = defineWidget({
  name: 'messageWidget',
  description: [
    'Renders a textual message to the user as Markdown.',
    'Call this to give your natural-language answer; it can be combined with',
    'other widget tools in the same turn (call it first).',
  ].join('\n'),
  component: MessageWidget,
  schema: z.object({
    text: z.string().describe('Markdown-formatted text to show to the user'),
  }),
});
