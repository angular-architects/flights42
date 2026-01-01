import { Pipe, PipeTransform } from '@angular/core';

export type CityFormat = 'long' | 'short';

@Pipe({
  name: 'city',
  standalone: true,
  pure: true,
})
export class CityPipe implements PipeTransform {
  transform(value: string, fmt?: CityFormat): string {
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
      case 'Wien':
        short = 'VIE';
        long = 'Vienna Airport';
        break;
      default:
        short = long = value;
    }

    if (fmt == 'short') return short;
    return long;
  }
}
