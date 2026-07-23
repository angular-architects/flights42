import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type FrontendToolHandlerContext } from '@copilotkit/core';

import { FlightStore } from '../../data/flight-store';
import { getCurrentBasketTool } from './get-current-basket.tool';
import { toggleFlightSelectionTool } from './toggle-flight-selection.tool';

const toolContext = {} as unknown as FrontendToolHandlerContext;

describe('toggle-flight-selection.tool', () => {
  let basket: ReturnType<typeof signal<Record<number, boolean>>>;

  beforeEach(() => {
    basket = signal<Record<number, boolean>>({});

    const fakeFlightStore = {
      basket,
      updateBasket(flightId: number, selected: boolean): void {
        basket.update((current) => ({ ...current, [flightId]: selected }));
      },
    };

    TestBed.configureTestingModule({
      providers: [{ provide: FlightStore, useValue: fakeFlightStore }],
    });
  });

  it('selects a flight and reports the new selection state', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      toggleFlightSelectionTool.handler(
        { flightId: 3, selected: true },
        toolContext,
      ),
    );

    expect(result).toEqual({ selected: true });
    expect(basket()[3]).toBe(true);
  });

  it('deselects a previously selected flight', async () => {
    basket.set({ 3: true });

    const result = await TestBed.runInInjectionContext(() =>
      toggleFlightSelectionTool.handler(
        { flightId: 3, selected: false },
        toolContext,
      ),
    );

    expect(result).toEqual({ selected: false });
    expect(basket()[3]).toBe(false);
  });

  it('exposes the selection to the read-only getCurrentBasket tool', async () => {
    await TestBed.runInInjectionContext(() =>
      toggleFlightSelectionTool.handler(
        { flightId: 42, selected: true },
        toolContext,
      ),
    );

    const currentBasket = await TestBed.runInInjectionContext(() =>
      getCurrentBasketTool.handler({}, toolContext),
    );

    expect(currentBasket).toEqual({ 42: true });
  });
});
