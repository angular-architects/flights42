import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

import { defineAgUiComponent } from '../ag-ui-types';

@Component({
  selector: 'lib-message-widget',
  imports: [MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <span><markdown [data]="data()"></markdown></span> `,
})
export class MessageWidgetComponent {
  readonly data = input.required<string>();
}

export const messageWidgetComponent = defineAgUiComponent({
  name: 'messageWidget',
  description: 'Displays a plain text or markdown message to the user.',
  component: MessageWidgetComponent,
  schema: z.object({
    data: z.string().describe('Plain text or markdown to display to the user.'),
  }),
});
