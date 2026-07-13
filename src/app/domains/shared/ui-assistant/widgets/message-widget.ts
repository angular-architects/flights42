import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { z } from 'zod';

import { createFrontendTool } from '../../util-copilotkit/tool-definition';

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
