import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { defineAgUiComponent } from '@internal/ag-ui-client';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

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
