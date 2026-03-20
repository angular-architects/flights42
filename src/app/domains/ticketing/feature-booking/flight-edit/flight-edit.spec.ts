import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { page } from 'vitest/browser';

import { initialFlight } from '../../data/flight';
import { FlightDetailStore } from './flight-detail-store';
import { FlightEdit } from './flight-edit';

class FlightDetailStoreMock {
  private readonly flightState = signal(initialFlight);
  readonly flightValue = this.flightState.asReadonly();
  readonly saveFlightIsPending = signal(false);

  setFlightId(id: number): void {
    this.flightState.update((flight) => ({
      ...flight,
      id,
    }));
  }
}

describe('FlightEdit (router)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightEdit],
      providers: [
        provideRouter([
          {
            path: 'flight-edit/:id',
            component: FlightEdit,
          },
        ]),
        {
          provide: FlightDetailStore,
          useClass: FlightDetailStoreMock,
        },
      ],
    }).compileComponents();
  });

  it('shows the route id in the id field', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/flight-edit/42', FlightEdit);

    const input = page.getByLabelText('ID');

    await expect.element(input).toHaveValue(42);
  });
});
