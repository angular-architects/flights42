import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GenerativeUiPrefs {
  readonly preventCaching = signal(false);
}
