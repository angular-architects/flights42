import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { createTestFlight } from '../../testing/create-test-flight';
import { provideTestConfig } from '../../testing/provide-test-config';
import { runTasks } from '../../testing/run-tasks';
import { FlightStore } from './flight-store';

describe('flight-store', () => {
  let store: FlightStore;
  let ctrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [FlightStore, provideHttpClientTesting(), provideTestConfig()],
    });
    store = TestBed.inject(FlightStore);
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('has no selected flights initially', () => {
    const keys = Object.keys(store.basket);
    expect(keys.length).toBe(0);
  });

  it('loads flights when from and to given', async () => {
    store.updateFilter('Paris', 'London');
    await runTasks();

    const request = ctrl.expectOne('/flight?from=Paris&to=London');

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    await runTasks();

    const flights = store.flights();
    expect(flights.length).toBe(3);

    ctrl.verify();
  });

  it('does not load flights when from and to are not given', async () => {
    store.updateFilter('', '');

    await runTasks();

    ctrl.verify();
    const flights = store.flights();
    expect(flights.length).toBe(0);
  });
});
