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
import {
  initialTicketContext,
  type TicketWidgetContext,
} from './ticket-widget-context';

@Component({
  selector: 'app-ticket-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TicketLogo, TicketQr, TicketBarcode],
  templateUrl: './ticket-widget.html',
  styleUrl: './ticket-widget.css',
})
export class TicketWidget implements AfterViewInit {
  readonly props = input<TicketWidgetContext>(initialTicketContext);
  readonly surfaceId = input.required<string>();
  readonly componentId = input.required<string>();
  readonly dataContextPath = input('/');

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

  // The agent may legitimately omit optional props (e.g. `delay` when the
  // flight is on time). `props().<prop>` is `undefined` in that case and
  // calling `.value()` on it would throw. Guard every accessor with `?.` and
  // a sensible fallback so the ticket still renders.
  protected readonly ticketId = computed(
    () => this.props().ticketId?.value() ?? '',
  );
  protected readonly from = computed(() => this.props().from?.value() ?? '');
  protected readonly to = computed(() => this.props().to?.value() ?? '');
  protected readonly delay = computed(() => this.props().delay?.value() ?? 0);

  protected readonly showDelay = computed(() => this.delay() > 0);

  protected readonly parsedDate = computed(() =>
    parseTicketDate(this.props().date?.value()),
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
