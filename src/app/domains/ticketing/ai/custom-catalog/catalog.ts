import { createCustomCatalog } from '../../../shared/util-copilotkit/a2ui/types';
import { ticketingExtraComponents } from './ticketing-extra-components';

export const customCatalog = createCustomCatalog({
  id: 'https://a2ui.org/specification/v0_9/basic_catalog.json',
  components: ticketingExtraComponents,
});
