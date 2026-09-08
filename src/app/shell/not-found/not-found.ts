import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  imports: [],
  template: `
    <h1>Not Found</h1>
    <p>The requested record does not exist.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
