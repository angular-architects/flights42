import { ChangeDetectionStrategy, Component, inject, input, numberAttribute } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-passenger-edit',
  imports: [],
  templateUrl: './passenger-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerEdit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  protected readonly id = input.required({
    transform: numberAttribute,
  });

  back(): void {
    this.router.navigate(['/passenger-search']);
  }

  constructor() {
    this.activatedRoute.paramMap.subscribe((paramMap) => {
      console.log('paramMap', paramMap);
    });

    this.activatedRoute.queryParamMap.subscribe((queryParamMap) => {
      console.log('queryParamMap', queryParamMap);
    });
  }
}
