import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-flight-edit',
  imports: [RouterLink],
  templateUrl: './flight-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightEdit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  protected readonly id = input.required({
    transform: numberAttribute,
  });

  protected readonly showDetails = input({
    transform: booleanAttribute,
  });

  protected readonly expertMode = input.required({
    transform: custonBooleanAttribute,
  });

  back(): void {
    this.router.navigate(['/flight-search'], {
      queryParams: {
        lastId: this.id(),
      },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      fragment: 'result',
    });

    // Alternative
    // this.router.navigateByUrl('/flight-search');
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

function custonBooleanAttribute(value: unknown): boolean {
  const valueAsString = String(value);
  return valueAsString === 'true' || valueAsString === '1';
}
