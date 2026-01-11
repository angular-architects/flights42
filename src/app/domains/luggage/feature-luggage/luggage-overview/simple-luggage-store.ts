import { inject, Injectable, signal } from '@angular/core';

import { LuggageClient } from '../../data/luggage-client';

@Injectable()
export class SimpleLuggageStore {
  private luggageClient = inject(LuggageClient);

  private readonly luggageResource = this.luggageClient.findLuggage();
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
