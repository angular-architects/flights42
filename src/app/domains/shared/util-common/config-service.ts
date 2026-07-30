import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Config {
  readonly baseUrl: string;
  readonly model: string;
}

@Service()
export class ConfigService {
  private readonly http = inject(HttpClient);

  private _baseUrl = 'https://demo.angulararchitects.io/api';
  private _model = 'gpt-5-chat-latest';

  get baseUrl() {
    return this._baseUrl;
  }

  get model() {
    return this._model;
  }

  async load(configPath = '/config.json'): Promise<void> {
    const config = await firstValueFrom(this.http.get<Config>(configPath));
    this._model = config.model;
    this._baseUrl = config.baseUrl;
  }
}
