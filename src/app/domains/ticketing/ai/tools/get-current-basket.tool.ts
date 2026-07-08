import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { FlightStore } from '../../data/flight-store';

const getCurrentBasketSchema = z.object({});

export type GetCurrentBasketArgs = z.infer<typeof getCurrentBasketSchema>;

function getCurrentBasket(_args: GetCurrentBasketArgs) {
  const store = inject(FlightStore);
  return store.basket();
}

const getCurrentBasketDescription =
  'Returns all selected flights as an object mapping flightIds to booleans.';

export const getCurrentBasketFrontendTool = createFrontendTool({
  name: 'getCurrentBasket',
  description: getCurrentBasketDescription,
  parameters: getCurrentBasketSchema,
  handler: async (args) => getCurrentBasket(args),
});

export const getCurrentBasketTool = defineAgUiTool({
  name: 'getCurrentBasket',
  description: getCurrentBasketDescription,
  schema: getCurrentBasketSchema,
  execute: getCurrentBasket,
});
