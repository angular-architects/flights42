import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';

import { createTestFlight } from '../../../../testing/create-test-flight';
import { provideTestConfig } from '../../../../testing/provide-test-config';
import { runTasks } from '../../../../testing/run-tasks';
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSearch);
    component = fixture.componentInstance;

    ctrl = TestBed.inject(HttpTestingController);

    // Await initial data loading
    await runTasks();
    const request = ctrl.expectOne('/flight?from=Graz&to=Hamburg');
    request.flush([]);

    await fixture.whenStable();
  });

  it('can be created', () => {
    expect(component).not.toBeUndefined();
  });

  it('disables search button when from and to are not given', async () => {
    await page.getByLabelText('From').fill('');
    await page.getByLabelText('To').fill('');

    const button = page
      .getByRole('button', { name: 'Search' })
      .element() as HTMLButtonElement;
    const disabled = button.disabled;

    expect(disabled).toBeTruthy();
  });

  it('enables search button when from and to are given', async () => {
    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    const button = page
      .getByRole('button', { name: 'Search' })
      .element() as HTMLButtonElement;
    const disabled = button.disabled;

    expect(disabled).toBeFalsy();
  });

  it('searches for flights when from and to are given', async () => {
    const flightStore = TestBed.inject(FlightStore);
    // Alternative for local services
    // flightStore = fixture.debugElement.injector.get(FlightStore);

    vi.spyOn(flightStore, 'updateFilter');

    await page.getByLabelText('From').fill('Paris');
    await page.getByLabelText('To').fill('London');

    const button = page
      .getByRole('button', { name: 'Search' })
      .element() as HTMLButtonElement;

    button.click();

    await runTasks();

    const request = ctrl.expectOne('/flight?from=Paris&to=London');

    request.flush([
      createTestFlight(1),
      createTestFlight(2),
      createTestFlight(3),
    ]);

    await fixture.whenStable();

    const headings = page.getByRole('heading', {
      name: 'Paris - London',
    });

    expect(headings.length).toBe(3);

    expect(flightStore.updateFilter).toBeCalled();
    expect(flightStore.updateFilter).toBeCalledTimes(1);
    expect(flightStore.updateFilter).toBeCalledWith('Paris', 'London');
  });
});
