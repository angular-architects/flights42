import { inject, Service, signal } from '@angular/core';

import { withPreviousValue } from '../../../shared/util-common/with-previous-value';
import { LuggageClient } from '../../data/luggage-client';

@Service({ autoProvided: false })
export class SimpleLuggageStore {
  private luggageClient = inject(LuggageClient);

  private readonly luggageResource = withPreviousValue(
    this.luggageClient.findLuggage(),
  );
  readonly luggage = this.luggageResource.value;
  readonly isLoading = this.luggageResource.isLoading;
  readonly error = this.luggageResource.error;

  // Selected
  private readonly _selected = signal<Record<number, boolean>>({});
  readonly selected = this._selected.asReadonly();

  updateSelected(luggageId: number, selected: boolean): void {
    this._selected.update((current) => ({
      ...current,
      [luggageId]: selected,
    }));
  }
}
