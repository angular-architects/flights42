import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';

import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
import { appSettings } from '../../../shared/util-common/app-settings';
import { provideLanguageService } from '../../../shared/util-common/language';
import { FlightSearch } from './flight-search';
import { FlightStore } from './flight-store';

describe('flight-search', () => {
  let component: FlightSearch;
  let fixture: ComponentFixture<FlightSearch>;
  let ctrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightSearch],
      providers: [
        provideHttpClientTesting(),
        provideTestConfig(),
        provideLanguageService('default'),
      ],
    }).compileComponents();

    // Turn off debouncing so the form propagates changes immediately
    vi.spyOn(appSettings, 'debounceTimeMs', 'get').mockReturnValue(0);

    fixture = TestBed.createComponent(FlightSearch);
    component = fixture.componentInstance;

    ctrl = TestBed.inject(HttpTestingController);

    // Await the initial data loading (from = Graz, to = Hamburg)
    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Graz&to=Hamburg'),
      { interval: 0 },
    );
    request.flush([]);

    await fixture.whenStable();
  });

  afterEach(() => {
    ctrl.verify();
  });

  it('can be created', () => {
    expect(component).not.toBeUndefined();
  });

  it('disables the search button when from and to are empty', async () => {
    await page.getByLabelText('From').fill('');
    await page.getByLabelText('To').fill('');

    const button = page.getByRole('button', { name: 'Search' });
    await expect.element(button).toBeDisabled();
  });

  it('loads flights when the search criteria change', async () => {
    await page.getByLabelText('To').fill('London');

    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Graz&to=London'),
      { interval: 0 },
    );

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    await fixture.whenStable();
  });

  it('delegates the filter changes to the store', async () => {
    const store = TestBed.inject(FlightStore);
    vi.spyOn(store, 'updateFilter');

    await page.getByLabelText('To').fill('London');

    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Graz&to=London'),
      { interval: 0 },
    );
    request.flush([]);

    await fixture.whenStable();

    expect(store.updateFilter).toBeCalledWith('Graz', 'London');
  });
});
