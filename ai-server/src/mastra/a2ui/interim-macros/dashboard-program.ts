import {
  A2uiGenerator,
  type AgentToRendererMessage,
  CatalogConfig,
} from '@a2ui/agent';

import {
  boardingPassesSchema,
  bookedFlightsListSchema,
  dashboardSchema,
  type DashboardSpec,
  dashboardSpecSchema,
  delayedFlightsTableSchema,
  delayShareChartSchema,
  delaysPerDayChartSchema,
  flightSearchSchema,
  flightsTableSchema,
  hotelsSchema,
  rentalCarsSchema,
  weatherListSchema,
} from '../../dashboard-dsl/dashboard-spec.js';
import { compileExpress, createCatalog } from '../a2ui-express.js';

interface ComponentNode {
  component: string;
}

const DASHBOARD_CATALOG_ID =
  'https://example.com/catalogs/flights42-dashboard-macros';

const dashboardCatalog = createCatalog(
  {
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
  DASHBOARD_CATALOG_ID,
);

const catalogConfig = new CatalogConfig(dashboardCatalog);

const generator = new A2uiGenerator([catalogConfig]);

const dashboardProcessor = generator.createProcessor({
  supportedCatalogIds: [DASHBOARD_CATALOG_ID],
});

export function expressToDashboardSpec(express: string): DashboardSpec {
  const messages = compileExpress(dashboardProcessor, express);
  const tiles = messages
    .flatMap((message) => extractComponents(message))
    .filter((node) => node.component !== 'Dashboard');
  return dashboardSpecSchema.parse({ tiles });
}

function extractComponents(message: AgentToRendererMessage): ComponentNode[] {
  if (!('updateComponents' in message)) {
    return [];
  }
  return message.updateComponents.components;
}
