import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-passenger-edit',
  imports: [],
  templateUrl: './passenger-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerEdit {
  protected readonly id = input.required({
    transform: numberAttribute,
  });
}
