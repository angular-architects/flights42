import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { subMinutes } from 'date-fns';

import { TicketBarcode } from './ticket-barcode';
import { TicketLogo } from './ticket-logo';
import { TicketQr } from './ticket-qr';
import { type TicketWidgetProps } from './ticket-widget-context';

@Component({
  selector: 'app-ticket-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TicketLogo, TicketQr, TicketBarcode],
  templateUrl: './ticket-widget.html',
  styleUrl: './ticket-widget.css',
})
export class TicketWidget implements AfterViewInit {
  readonly props = input.required<TicketWidgetProps>();

  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * Barcode + QR render only when true. Disabled on the dynamic dashboard
   * (`.dashboard-output`) for a compact tile; chat and other surfaces stay full.
   */
  protected readonly showScanCodes = signal(true);

  ngAfterViewInit(): void {
    if (this.hostEl.nativeElement.closest('.dashboard-output')) {
      this.showScanCodes.set(false);
      this.cdr.markForCheck();
    }
  }

  protected readonly gate = 'B7';
  protected readonly seat = '14A';

  protected readonly ticketId = computed(() => this.props().ticketId ?? '');
  protected readonly from = computed(() => this.props().from ?? '');
  protected readonly to = computed(() => this.props().to ?? '');
  protected readonly delay = computed(() => this.props().delay ?? 0);

  protected readonly showDelay = computed(() => this.delay() > 0);

  protected readonly parsedDate = computed(() =>
    parseTicketDate(this.props().date),
  );

  protected readonly boardingTime = computed(() =>
    computeBoardingTime(this.parsedDate()),
  );

  protected readonly barcodeSeed = computed(() => {
    return `FL-${this.ticketId()}-${this.from()}-${this.to()}`;
  });

  protected readonly qrSeed = computed(() => {
    return `FL${this.ticketId()}|${this.seat}`;
  });
}

const BOARDING_OFFSET_MINUTES = 30;

function parseTicketDate(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeBoardingTime(date: Date | null): Date | null {
  return date ? subMinutes(date, BOARDING_OFFSET_MINUTES) : null;
}
