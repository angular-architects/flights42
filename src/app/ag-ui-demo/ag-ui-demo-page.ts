import { ChangeDetectionStrategy, Component } from '@angular/core';

import { agUiResource } from '../domains/shared/ui-agent/ag-ui-resource';
import { createShowComponentsTool } from '../domains/shared/ui-agent/tools/show-component.tool';
import { ChatMessages } from '../domains/shared/ui-assistant/chat-messages/chat-messages';
import { weatherWidget } from './weather-widget';

const showComponentsTool = createShowComponentsTool([weatherWidget]);

@Component({
  selector: 'app-ag-ui-demo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatMessages],
  template: `
    <div style="padding: 1rem; max-width: 600px">
      <h2>AG-UI Demo</h2>
      <p>
        Dummy-Agent mit Thread-ID <strong>4711</strong>, Run-ID
        <strong>0815</strong>
      </p>
      <button (click)="start()" [disabled]="chat.isLoading()">
        Demo starten
      </button>
      <app-chat-messages
        [messages]="chat.value()"
        [pending]="chat.isLoading()" />
    </div>
  `,
})
export class AgUiDemoPage {
  protected readonly chat = agUiResource({
    url: 'http://localhost:4300/api/demo-agent',
    tools: [showComponentsTool],
    hideInternal: false,
  });

  protected start(): void {
    this.chat.reset();
    this.chat.sendMessage({
      role: 'user',
      content: 'Wie ist das Flugwetter in Frankfurt?',
    });
  }
}
