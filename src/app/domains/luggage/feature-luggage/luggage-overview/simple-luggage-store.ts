import { inject, Injectable, signal } from '@angular/core';

import { LuggageService } from '../../data/luggage-service';

@Injectable()
export class SimpleLuggageStore {
  private luggageService = inject(LuggageService);

  private readonly luggageResource = this.luggageService.findLuggage();
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
