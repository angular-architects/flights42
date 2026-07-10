import { type InputContentPart } from '@ag-ui/core';
import { Component, input } from '@angular/core';
import { type Message } from '@copilotkit/angular';

import { CopilotActivity } from '../copilot/activity/copilot-activity';
import { MessageComponent } from '../message';
import { ToolCallView } from './tool-call-view';

const ATTACHMENT_LABELS: Record<string, string> = {
  image: '[Bild hochgeladen]',
  audio: '[Audio hochgeladen]',
  video: '[Video hochgeladen]',
  document: '[Dokument hochgeladen]',
  binary: '[Datei hochgeladen]',
};

@Component({
  selector: 'app-chat-messages',
  imports: [ToolCallView, CopilotActivity, MessageComponent],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<Message[]>();
  readonly agentId = input.required<string>();
  readonly pending = input<boolean>(false);
  readonly greeting = input<string>('Hi! How can I help you?');

  protected userText(content: string | InputContentPart[]): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join(' ')
      .trim();
  }

  protected userAttachments(
    content: string | InputContentPart[],
  ): { label: string }[] {
    if (typeof content === 'string') {
      return [];
    }

    return content
      .filter((part) => part.type !== 'text')
      .map((part) => ({ label: ATTACHMENT_LABELS[part.type] ?? '[Anhang]' }));
  }
}
