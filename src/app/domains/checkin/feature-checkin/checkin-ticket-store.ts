import { Injectable, signal } from '@angular/core';
import { z } from 'zod';

/**
 * Zod schema mirroring the TicketInfoSchema from the plan. Used both
 * as the Zod validation source for the `fillCheckinForm` client tool
 * and as the type for the extracted-ticket signal exposed below.
 */
export const TicketInfoSchema = z.object({
  ticketId: z
    .string()
    .describe('Booking reference / PNR or ticket id printed on the ticket')
    .optional(),
  passenger: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      passport: z
        .object({
          passportNumber: z.string().optional(),
          issuedOn: z
            .string()
            .describe('Issue date in YYYY-MM-DD format if visible')
            .optional(),
          validUntil: z
            .string()
            .describe('Expiry date in YYYY-MM-DD format if visible')
            .optional(),
          issuingAuthority: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  flight: z
    .object({
      flightNumber: z.string().optional(),
      from: z
        .string()
        .describe('IATA code or city name of departure airport')
        .optional(),
      to: z
        .string()
        .describe('IATA code or city name of arrival airport')
        .optional(),
      departureAt: z.string().describe('ISO datetime if visible').optional(),
      seat: z.string().optional(),
      gate: z.string().optional(),
      boardingTime: z.string().optional(),
      cabinClass: z.string().optional(),
    })
    .optional(),
  notes: z.string().describe('Anything noteworthy or unreadable').optional(),
});

export type TicketInfo = z.infer<typeof TicketInfoSchema>;

export type CheckinExtractionStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'filled'
  | 'error';

/**
 * Tiny signal-backed bridge between the AG-UI client tool handler and
 * the checkin page. The `fillCheckinForm` handler writes the extracted
 * ticket info here; the page reads it and patches its form (without
 * the AI service needing a direct reference to the page).
 */
@Injectable({ providedIn: 'root' })
export class CheckinTicketStore {
  private readonly _extractedTicket = signal<TicketInfo | undefined>(undefined);
  private readonly _status = signal<CheckinExtractionStatus>('idle');
  private readonly _errorMessage = signal<string | undefined>(undefined);

  readonly extractedTicket = this._extractedTicket.asReadonly();
  readonly status = this._status.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  setExtractedTicket(info: TicketInfo): void {
    this._extractedTicket.set(info);
    this._status.set('filled');
    this._errorMessage.set(undefined);
  }

  setStatus(status: CheckinExtractionStatus, errorMessage?: string): void {
    this._status.set(status);
    this._errorMessage.set(errorMessage);
  }

  reset(): void {
    this._extractedTicket.set(undefined);
    this._status.set('idle');
    this._errorMessage.set(undefined);
  }
}
