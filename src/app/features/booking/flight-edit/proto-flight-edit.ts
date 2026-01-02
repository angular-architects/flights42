import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  numberAttribute,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flight-edit',
  imports: [RouterLink],
  templateUrl: './proto-flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtoFlightEdit {
  protected readonly id = input.required({
    transform: numberAttribute,
  });

  protected readonly showDetails = input({
    transform: booleanAttribute,
  });

  constructor() {
    effect(() => {
      console.log('id', this.id());
    });
  }
}
