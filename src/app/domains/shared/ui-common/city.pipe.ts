import { Pipe, PipeTransform } from '@angular/core';

export type CityFormat = 'long' | 'short';

@Pipe({
  name: 'appCity',
  pure: true,
})
export class CityPipe implements PipeTransform {
  transform(value: string, format?: CityFormat): string {
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

    if (format == 'short') return short;
    return long;
  }
}
