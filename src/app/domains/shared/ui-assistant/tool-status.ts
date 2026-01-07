import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tool-status',
  imports: [MatIconModule],
  template: `
    @if (pending()) {
      <div class="ai-wait-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    } @else {
      <div class="ai-ready-indicator">☑️</div>
    }
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class ToolStatusComponent {
  pending = input(false);
}
