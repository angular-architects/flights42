import {
  ChangeDetectionStrategy,
  Component,
  input,
  Resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CityPipe } from '../../../shared/ui-common/city.pipe';
import { Luggage } from '../../data/luggage';

@Component({
  selector: 'app-luggage-detail',
  imports: [CityPipe, RouterLink],
  templateUrl: './luggage-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LuggageDetail {
  readonly luggage = input.required<Resource<Luggage | undefined>>();
}
