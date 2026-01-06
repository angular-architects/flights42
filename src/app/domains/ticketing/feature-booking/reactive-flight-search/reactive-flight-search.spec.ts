import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';

import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
import { FlightStore } from '../flight-search/flight-store';
import { ReactiveFlightSearch } from './reactive-flight-search';

describe.only('reactive-flight-search', () => {
  let component: ReactiveFlightSearch;
  let fixture: ComponentFixture<ReactiveFlightSearch>;
  let ctrl: HttpTestingController;

  let flightStore: FlightStore;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [ReactiveFlightSearch],
      providers: [
        provideRouter([]),
        provideHttpClientTesting(),
        provideTestConfig(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReactiveFlightSearch);
    component = fixture.componentInstance;

    ctrl = TestBed.inject(HttpTestingController);
    flightStore = TestBed.inject(FlightStore);

    // Alternative for local services
    // flightStore = fixture.debugElement.injector.get(FlightStore);

    // Await initial data loading
    await vi.runAllTimersAsync();
    const request = ctrl.expectOne('/flight?from=Graz&to=Hamburg');
    request.flush([]);
    await vi.runAllTimersAsync();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('can be created', () => {
    expect(component).not.toBeUndefined();
  });

  it('searches for flights when from and to are given', async () => {
    vi.spyOn(flightStore, 'updateFilter');

    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    await vi.runAllTimersAsync();

    const request = ctrl.expectOne('/flight?from=Paris&to=London');

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    await vi.runAllTimersAsync();

    await fixture.whenStable();

    const headings = page.getByRole('heading', {
      name: 'Paris - London',
    });

    expect(headings.length).toBe(3);
    expect(flightStore.updateFilter).toBeCalled();
    expect(flightStore.updateFilter).toBeCalledTimes(2);
    expect(flightStore.updateFilter).toBeCalledWith('Paris', 'London');
  });
});
