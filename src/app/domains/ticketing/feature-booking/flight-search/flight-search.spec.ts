import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';

import { provideLanguageService } from '../../../shared/util-common/language';
import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
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
        provideRouter([]),
        provideHttpClientTesting(),
        provideTestConfig(),
        provideLanguageService('default'),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSearch);
    component = fixture.componentInstance;

    ctrl = TestBed.inject(HttpTestingController);

    // Await the initial data loading (from = Graz, to = Hamburg)
    const request = await vi.waitFor(
      () => ctrl.expectOne('/flight?from=Graz&to=Hamburg'),
      { interval: 50, timeout: 1000 },
    );
    request.flush([]);
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

  it('enables the search button when from and to are given', async () => {
    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    const button = page.getByRole('button', { name: 'Search' });
    await expect.element(button).toBeEnabled();
  });

  it('searches for flights when the search button is clicked', async () => {
    const store = TestBed.inject(FlightStore);
    vi.spyOn(store, 'updateFilter');

    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    const button = page.getByRole('button', { name: 'Search' });
    await button.click();

    const request = await vi.waitFor(() =>
      ctrl.expectOne('/flight?from=Paris&to=London'),
    );

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    expect(store.updateFilter).toBeCalledWith('Paris', 'London');
  });
});
