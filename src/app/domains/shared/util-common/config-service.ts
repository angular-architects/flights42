import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Config {
  readonly baseUrl: string;
  readonly agUiUrl: string;
  readonly model: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);

  private _baseUrl = 'https://demo.angulararchitects.io/api';
  private _agUiUrl = 'http://localhost:3001/ag-ui/ticketingAgent';
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

  async load(configPath = '/config.json'): Promise<void> {
    const config = await firstValueFrom(this.http.get<Config>(configPath));
    this._model = config.model;
    this._baseUrl = config.baseUrl;
    this._agUiUrl = config.agUiUrl;
  }
}
