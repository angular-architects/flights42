import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  readonly baseUrl = 'https://demo.angulararchitects.io/api';
}
