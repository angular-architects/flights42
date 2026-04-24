import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
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
export class TicketWidget {
  readonly props = input<TicketWidgetContext>(initialTicketContext);
  readonly surfaceId = input.required<string>();
  readonly componentId = input.required<string>();
  readonly dataContextPath = input('/');

  protected readonly gate = 'B7';
  protected readonly seat = '14A';

  protected readonly ticketId = computed(() => this.props().ticketId.value());
  protected readonly from = computed(() => this.props().from.value());
  protected readonly to = computed(() => this.props().to.value());
  protected readonly delay = computed(() => this.props().delay.value());

  protected readonly showDelay = computed(() => this.delay() > 0);

  protected readonly parsedDate = computed(() =>
    parseTicketDate(this.props().date.value()),
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
