import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Config {
  baseUrl: string;
  icao: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);

  private _baseUrl = 'https://demo.angulararchitects.io/api';
  private _icao = false;

  get baseUrl(): string {
    return this._baseUrl;
  }

  get icao(): boolean {
    return this._icao;
  }

  async load(configPath = '/config.json'): Promise<void> {
    const config = await firstValueFrom(this.http.get<Config>(configPath));
    this._baseUrl = config.baseUrl;
    this._icao = config.icao;
  }
}
