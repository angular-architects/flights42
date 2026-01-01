import { inject, Injectable } from '@angular/core';
import { LuggageService } from '../../data/luggage-service';

@Injectable({ providedIn: 'root' })
export class LuggageStore {
  private luggageService = inject(LuggageService);

  private readonly luggageResource = this.luggageService.findLuggage();
  readonly luggage = this.luggageResource.value;
  readonly isLoading = this.luggageResource.isLoading;
  readonly error = this.luggageResource.error;
}
