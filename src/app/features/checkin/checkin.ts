import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CheckinDialogComponent } from './checkin-dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkin',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkin {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private dialog = inject(MatDialog);

  protected readonly ticketId = signal<number | undefined>(undefined);

  protected readonly expertMode = input.required({
    transform: custonBooleanAttribute,
  });

  navigateToNextFlights(): void {
    this.router.navigate(['/next-flights'], {
      queryParams: {
        success: true,
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
      const ticketId = parseInt(paramMap.get('ticketId') ?? '0');
      if (ticketId) {
        this.ticketId.set(ticketId);
      }
    });

    this.activatedRoute.queryParamMap.subscribe((queryParamMap) => {
      console.log('queryParamMap', queryParamMap);
    });
  }

  checkin(): void {
    this.dialog.open(CheckinDialogComponent, {
      width: '400px',
    });
  }
}

function custonBooleanAttribute(value: unknown): boolean {
  const valueAsString = String(value);
  return valueAsString === 'true' || valueAsString === '1';
}
