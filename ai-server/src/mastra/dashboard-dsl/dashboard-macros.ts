import { defineMacro } from '../a2ui/simple-macros/macro.js';
import {
  loadBoardingPasses,
  loadBookedFlightsList,
  loadDelayShareChart,
  loadDelaysPerDayChart,
  loadFlightSearch,
  loadFlightsTable,
  loadHotels,
  loadRentalCars,
  loadWeatherList,
} from './dashboard-loaders.js';
import {
  buildBoardingPasses,
  buildBookedFlightsList,
  buildDashboard,
  buildDelayShareChart,
  buildDelaysPerDayChart,
  buildFlightSearch,
  buildFlightsTable,
  buildImageRowList,
  buildWeatherList,
} from './dashboard-renderers.js';
import {
  boardingPassesSchema,
  bookedFlightsListSchema,
  dashboardSchema,
  delayedFlightsTableSchema,
  delayShareChartSchema,
  delaysPerDayChartSchema,
  flightSearchSchema,
  flightsTableSchema,
  hotelsSchema,
  rentalCarsSchema,
  weatherListSchema,
} from './dashboard-spec.js';

export const dashboardMacros = {
  Dashboard: defineMacro({
    schema: dashboardSchema,
    render: (node) => {
      return buildDashboard(node);
    },
  }),
  FlightsTable: defineMacro({
    schema: flightsTableSchema,
    load: (node) => {
      return loadFlightsTable(node, false);
    },
    render: (node) => {
      return buildFlightsTable(node, false);
    },
  }),
  DelayedFlightsTable: defineMacro({
    schema: delayedFlightsTableSchema,
    load: (node) => {
      return loadFlightsTable(node, true);
    },
    render: (node) => {
      return buildFlightsTable(node, true);
    },
  }),
  DelayShareChart: defineMacro({
    schema: delayShareChartSchema,
    load: (node) => {
      return loadDelayShareChart(node);
    },
    render: (node) => {
      return buildDelayShareChart(node);
    },
  }),
  DelaysPerDayChart: defineMacro({
    schema: delaysPerDayChartSchema,
    load: (node) => {
      return loadDelaysPerDayChart(node);
    },
    render: (node) => {
      return buildDelaysPerDayChart(node);
    },
  }),
  BoardingPasses: defineMacro({
    schema: boardingPassesSchema,
    load: (node) => {
      return loadBoardingPasses(node);
    },
    render: (node) => {
      return buildBoardingPasses(node);
    },
  }),
  BookedFlightsList: defineMacro({
    schema: bookedFlightsListSchema,
    load: (node) => {
      return loadBookedFlightsList(node);
    },
    render: (node) => {
      return buildBookedFlightsList(node);
    },
  }),
  FlightSearch: defineMacro({
    schema: flightSearchSchema,
    load: (node) => {
      return loadFlightSearch(node);
    },
    render: (node) => {
      return buildFlightSearch(node);
    },
  }),
  RentalCars: defineMacro({
    schema: rentalCarsSchema,
    load: (node) => {
      return loadRentalCars(node);
    },
    render: (node) => {
      return buildImageRowList(node.id);
    },
  }),
  Hotels: defineMacro({
    schema: hotelsSchema,
    load: (node) => {
      return loadHotels(node);
    },
    render: (node) => {
      return buildImageRowList(node.id);
    },
  }),
  WeatherList: defineMacro({
    schema: weatherListSchema,
    load: (node) => {
      return loadWeatherList(node);
    },
    render: (node) => {
      return buildWeatherList(node);
    },
  }),
};
