import { inject } from '@angular/core';
import { defineAgUiTool } from '@internal/ag-ui-client';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { FlightStore } from '../../data/flight-store';

const toggleFlightSelectionSchema = z.object({
  flightId: z.number().describe('id of flight to select or deselect'),
  selected: z
    .boolean()
    .describe('whether flight should be selected or deselected'),
});

export type ToggleFlightSelectionArgs = z.infer<
  typeof toggleFlightSelectionSchema
>;

export function toggleFlightSelection(args: ToggleFlightSelectionArgs) {
  const store = inject(FlightStore);
  store.updateBasket(args.flightId, args.selected);
  return { selected: args.selected };
}

export const toggleFlightSelectionFrontendTool = createFrontendTool({
  name: 'toggleFlightSelection',
  description:
    'Selects a flight or deselects it. Selected flights are added to the basket.',
  parameters: toggleFlightSelectionSchema,
  handler: async (args) => toggleFlightSelection(args),
});

export const toggleFlightSelectionTool = defineAgUiTool({
  name: 'toggleFlightSelection',
  description:
    'Selects a flight or deselects it. Selected flights are added to the basket.',
  schema: toggleFlightSelectionSchema,
  execute: toggleFlightSelection,
});
