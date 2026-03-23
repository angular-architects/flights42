import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
import { FlightStore } from './flight-store';

describe('flight-store', () => {
  let ctrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [FlightStore, provideHttpClientTesting(), provideTestConfig()],
    });
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('has no selected flights initially', () => {
    const store = TestBed.inject(FlightStore);
    const keys = Object.keys(store.basket());
    expect(keys.length).toBe(0);
  });

  it('loads flights when from and to given', async () => {
    const store = TestBed.inject(FlightStore);

    store.updateFilter('Paris', 'London');

    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Paris&to=London'),
      { interval: 0 },
    );

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    await vi.waitFor(() => {
      const flights = store.flightsValue();
      expect(flights.length).toBe(3);
    });

    ctrl.verify();
  });

  it('does not load flights when from and to are not given', async () => {
    const store = TestBed.inject(FlightStore);
    store.updateFilter('', '');

    expect(store.flightsIsLoading()).toBeFalsy();
    ctrl.verify();

    const flights = store.flightsValue();
    expect(flights.length).toBe(0);
  });
});
