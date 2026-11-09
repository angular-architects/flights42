import {
  A2uiGenerator,
  CatalogConfig,
  ComponentPruningTransformer,
  FunctionPruningTransformer,
} from '@a2ui/agent';
import { A2UI_CATALOG_ID } from '@flights42/a2ui-catalog/ticketing-extra-components';

import { ticketingCatalog } from './ticketing-catalog.js';

// All basic components and functions are listed in
// BASIC_COMPONENTS and BASIC_FUNCTIONS from @a2ui/web_core/v0_9
const VISIBLE_COMPONENTS = [
  'Button',
  'Card',
  'CheckBox',
  'ChoicePicker',
  'Column',
  'DateTimeInput',
  'Divider',
  'Icon',
  'Image',
  'List',
  'Row',
  'Text',
  'TextField',
  'TicketWidget',
];

const VISIBLE_FUNCTIONS = [
  'email',
  'formatCurrency',
  'formatDate',
  'formatNumber',
  'formatString',
  'required',
];

const catalogConfig = new CatalogConfig(ticketingCatalog, [
  new ComponentPruningTransformer(VISIBLE_COMPONENTS),
  new FunctionPruningTransformer(VISIBLE_FUNCTIONS),
]);

const generator = new A2uiGenerator([catalogConfig]);

export const a2uiProcessor = generator.createProcessor({
  supportedCatalogIds: [A2UI_CATALOG_ID],
});
