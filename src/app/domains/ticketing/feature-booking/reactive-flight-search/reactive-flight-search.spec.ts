import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';

import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
import { appSettings } from '../../../shared/util-common/app-settings';
import { FlightStore } from '../flight-search/flight-store';
import { ReactiveFlightSearch } from './reactive-flight-search';

describe('reactive-flight-search', () => {
  let component: ReactiveFlightSearch;
  let fixture: ComponentFixture<ReactiveFlightSearch>;
  let ctrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFlightSearch],
      providers: [
        provideRouter([]),
        provideHttpClientTesting(),
        provideTestConfig(),
      ],
    }).compileComponents();

    vi.spyOn(appSettings, 'debounceTimeMs', 'get').mockReturnValue(0);
    fixture = TestBed.createComponent(ReactiveFlightSearch);
    component = fixture.componentInstance;

    ctrl = TestBed.inject(HttpTestingController);

    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Graz&to=Hamburg'),
      { interval: 0 },
    );
    request.flush([]);
  });

  it('can be created', () => {
    expect(component).not.toBeUndefined();
  });

  it('searches for flights when from and to are given', async () => {
    const flightStore = TestBed.inject(FlightStore);

    vi.spyOn(flightStore, 'updateFilter');

    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Paris&to=London'),
      { interval: 0 },
    );

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    const headings = page.getByRole('heading', {
      name: 'Paris - London',
    });

    await expect.element(headings).toHaveLength(3);
    expect(flightStore.updateFilter).toBeCalled();
    expect(flightStore.updateFilter).toBeCalledTimes(3);
    expect(flightStore.updateFilter).toBeCalledWith('Paris', 'London');
  });
});
