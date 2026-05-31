import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flight-edit',
  imports: [RouterLink],
  template: `
    <h1>Flight Edit</h1>
    <p>Editing flight with id: {{ id() }}</p>
    <a routerLink="/booking/flight-search">Back to search</a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit {
  readonly id = input.required<string>();
}
