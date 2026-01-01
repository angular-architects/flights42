import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flight-edit',
  imports: [RouterLink],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit {
  protected readonly id = input.required({
    transform: numberAttribute,
  });

  protected readonly showDetails = input({
    transform: booleanAttribute,
  });
}
