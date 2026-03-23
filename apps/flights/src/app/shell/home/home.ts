import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  template: ` <h1>Welcome!</h1> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
