import { inject, Pipe, PipeTransform } from '@angular/core';

import { ConfigService } from '../util-common/config-service';

export type CityFormat = 'long' | 'short';

@Pipe({
  name: 'appCity',
})
export class CityPipe implements PipeTransform {
  private configService = inject(ConfigService);

  transform(value: string, format?: CityFormat): string {
    let short, long, icao;

    switch (value) {
      case 'Graz':
        short = 'GRZ';
        icao = 'LOWG';
        long = 'Graz Airport';
        break;
      case 'Hamburg':
        short = 'HAM';
        icao = 'EDDH';
        long = 'Hamburg Airport';
        break;
      case 'Paris':
        short = 'CDG';
        icao = 'LFPG';
        long = 'Paris - Charles de Gaulle';
        break;
      default:
        short = icao = long = value;
    }

    if (format === 'short' && this.configService.icao) {
      return icao;
    } else if (format === 'short') {
      return short;
    }

    return long;
  }
}
