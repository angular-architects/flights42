import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Config {
  readonly baseUrl: string;
  readonly agUiUrl: string;
  readonly aiServerUrl: string;
  readonly model: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);

  private _baseUrl = 'https://demo.angulararchitects.io/api';
  private _agUiUrl = 'http://localhost:3001/ag-ui/ticketingAgent';
  private _aiServerUrl = 'http://localhost:3001';
  private _model = 'gpt-5.3';

  get baseUrl() {
    return this._baseUrl;
  }

  get model() {
    return this._model;
  }

  get agUiUrl() {
    return this._agUiUrl;
  }

  get aiServerUrl() {
    return this._aiServerUrl;
  }

  async load(configPath = '/config.json'): Promise<void> {
    const config = await firstValueFrom(this.http.get<Config>(configPath));
    this._model = config.model;
    this._baseUrl = config.baseUrl;
    this._agUiUrl = config.agUiUrl;
    if (config.aiServerUrl) {
      this._aiServerUrl = config.aiServerUrl;
    }
  }
}
