import { createCustomCatalog } from '../../../shared/util-copilotkit/a2ui/types';
import { ticketingExtraComponents } from './ticketing-extra-components';

export const customCatalog = createCustomCatalog({
  id: 'https://example.com/catalogs/flights42-a2ui-demo',
  components: ticketingExtraComponents,
});
