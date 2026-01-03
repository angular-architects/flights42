import { Pipe, PipeTransform } from '@angular/core';

export type CityFormat = 'long' | 'short';

export interface CityPipeOptions {
  format: CityFormat;
}

@Pipe({
  name: 'appAltCity',
  pure: true,
})
export class AlternativeCityPipe implements PipeTransform {
  transform(value: string, options: CityPipeOptions): string {
    let short, long;

    switch (value) {
      case 'Hamburg':
        short = 'HAM';
        long = 'Hamburg Airport';
        break;
      case 'Graz':
        short = 'GRZ';
        long = 'Graz Airport';
        break;
      case 'Paris':
        short = 'CDG';
        long = 'Paris - Charles de Gaulle';
        break;
      default:
        short = long = value;
    }

    if (options.format == 'short') return short;
    return long;
  }
}
