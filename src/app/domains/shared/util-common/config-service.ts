import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Config {
  baseUrl: string;
}

@Service()
export class ConfigService {
  private http = inject(HttpClient);

  private _baseUrl = 'https://demo.angulararchitects.io/api';

  get baseUrl(): string {
    return this._baseUrl;
  }

  async load(configPath = '/config.json'): Promise<void> {
    const config = await firstValueFrom(this.http.get<Config>(configPath));
    this._baseUrl = config.baseUrl;
  }
}
