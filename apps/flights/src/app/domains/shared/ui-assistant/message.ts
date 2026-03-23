import { Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-message',
  imports: [MarkdownComponent],
  template: ` <span><markdown [data]="data()"></markdown></span> `,
})
export class MessageComponent {
  data = input.required<string>();
}
