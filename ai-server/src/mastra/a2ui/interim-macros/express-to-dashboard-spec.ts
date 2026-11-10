import {
  A2uiGenerator,
  type AgentToRendererMessage,
  CatalogConfig,
  InMemoryCatalogProvider,
} from '@a2ui/agent';

import {
  boardingPassesSchema,
  bookedFlightsListSchema,
  dashboardSchema,
  type DashboardSpec,
  delayedFlightsTableSchema,
  delayShareChartSchema,
  delaysPerDayChartSchema,
  flightSearchSchema,
  flightsTableSchema,
  hotelsSchema,
  rentalCarsSchema,
  weatherListSchema,
} from '../../dashboard-dsl/dashboard-spec.js';
import { PROTOCOL_VERSION } from '../a2ui-catalog-schema.js';
import { compileExpress } from '../a2ui-express.js';

interface ComponentNode {
  component: string;
}

const DASHBOARD_CATALOG_ID =
  'https://example.com/catalogs/flights42-dashboard-macros';

const catalogSchema = {
  catalogId: DASHBOARD_CATALOG_ID,
  components: {
    Dashboard: dashboardSchema.toJSONSchema(),
    FlightsTable: flightsTableSchema.toJSONSchema(),
    DelayedFlightsTable: delayedFlightsTableSchema.toJSONSchema(),
    DelayShareChart: delayShareChartSchema.toJSONSchema(),
    DelaysPerDayChart: delaysPerDayChartSchema.toJSONSchema(),
    BoardingPasses: boardingPassesSchema.toJSONSchema(),
    BookedFlightsList: bookedFlightsListSchema.toJSONSchema(),
    FlightSearch: flightSearchSchema.toJSONSchema(),
    RentalCars: rentalCarsSchema.toJSONSchema(),
    Hotels: hotelsSchema.toJSONSchema(),
    WeatherList: weatherListSchema.toJSONSchema(),
  },
};

const catalogProvider = new InMemoryCatalogProvider(
  catalogSchema,
  PROTOCOL_VERSION,
);
const dashboardCatalog = catalogProvider.load();

const catalogConfig = new CatalogConfig(dashboardCatalog);

const generator = new A2uiGenerator([catalogConfig]);

export const dashboardProcessor = generator.createProcessor({
  supportedCatalogIds: [DASHBOARD_CATALOG_ID],
});

export function expressToDashboardSpec(express: string): DashboardSpec {
  const messages = compileExpress(dashboardProcessor, express);

  const tiles = messages
    .flatMap((message) => extractComponents(message))
    .filter((node) => node.component !== 'Dashboard');

  if (tiles.length === 0) {
    throw new Error('The dashboard program renders no tiles');
  }
  return { tiles } as DashboardSpec;
}

function extractComponents(message: AgentToRendererMessage): ComponentNode[] {
  if (!('updateComponents' in message)) {
    return [];
  }
  return message.updateComponents.components;
}
