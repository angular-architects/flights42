import { Injectable } from '@angular/core';

export interface Config {
  readonly baseUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService implements Config {
  readonly baseUrl = 'https://demo.angulararchitects.io/api';
  readonly model = 'gpt-5-chat-latest';
}
