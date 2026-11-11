import type { A2uiComponent } from '../a2ui/simple-macros/macro.js';
import type {
  BoardingPassesNode,
  BookedFlightsListNode,
  DashboardNode,
  DelayedFlightsTableNode,
  DelayShareChartNode,
  DelaysPerDayChartNode,
  FlightSearchNode,
  FlightsTableNode,
  WeatherListNode,
} from './dashboard-spec.js';

export function buildDashboard(node: DashboardNode): A2uiComponent[] {
  return [{ id: node.id, component: 'Column', children: node.children }];
}

export function buildFlightsTable(
  node: FlightsTableNode | DelayedFlightsTableNode,
  onlyDelayed: boolean,
): A2uiComponent[] {
  const id = node.id;
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const hdrId = `${id}-hdr`;
  const listId = `${id}-list`;
  const rowId = `${id}-row`;
  const emptyId = `${id}-empty`;
  const headerCellIds = ['c0', 'c1', 'c2', 'c3'].map((c) => `${hdrId}-${c}`);
  const rowCellIds = ['c0', 'c1', 'c2', 'c3'].map((c) => `${rowId}-${c}`);
  const title = onlyDelayed
    ? `Delayed flights ${node.from} → ${node.to}`
    : `Flights ${node.from} → ${node.to}`;
  const lastColumnHeader = onlyDelayed ? 'Delay (min)' : 'Status';

  return [
    { id, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, hdrId, listId, emptyId],
    },
    { id: titleId, component: 'Text', text: title, variant: 'h2' },
    { id: hdrId, component: 'Row', align: 'stretch', children: headerCellIds },
    headerText(headerCellIds[0], 'Flight'),
    headerText(headerCellIds[1], 'Date'),
    headerText(headerCellIds[2], 'Time'),
    headerText(headerCellIds[3], lastColumnHeader),
    {
      id: listId,
      component: 'Column',
      children: { componentId: rowId, path: `/${id}/flights` },
    },
    { id: rowId, component: 'Row', align: 'stretch', children: rowCellIds },
    cellText(rowCellIds[0], 'number'),
    cellText(rowCellIds[1], 'date'),
    cellText(rowCellIds[2], 'time'),
    cellText(rowCellIds[3], 'status'),
    {
      id: emptyId,
      component: 'Text',
      text: { path: `/${id}/emptyMessage` },
      variant: 'body',
    },
  ];
}

export function buildDelayShareChart(
  node: DelayShareChartNode,
): A2uiComponent[] {
  const title = `Delay share ${node.from} → ${node.to}`;
  return chartTile(node.id, title);
}

export function buildDelaysPerDayChart(
  node: DelaysPerDayChartNode,
): A2uiComponent[] {
  const title = `Delays per day ${node.from} → ${node.to}`;
  return chartTile(node.id, title);
}

export function buildBoardingPasses(node: BoardingPassesNode): A2uiComponent[] {
  const ticketId = `${node.id}-ticket`;
  return [
    {
      id: node.id,
      component: 'Column',
      children: { componentId: ticketId, path: `/${node.id}/tickets` },
    },
    { id: ticketId, component: 'TicketWidget', ticket: { path: '.' } },
  ];
}

export function buildBookedFlightsList(
  node: BookedFlightsListNode,
): A2uiComponent[] {
  const id = node.id;
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const listId = `${id}-list`;
  const rowId = `${id}-row`;
  const colId = `${rowId}-col`;
  const routeId = `${rowId}-route`;
  const metaId = `${rowId}-meta`;
  const btnId = `${rowId}-btn`;
  const btnLabelId = `${btnId}-label`;
  const emptyId = `${id}-empty`;
  const showCheckIn = node.showCheckInButton ?? true;

  const components: A2uiComponent[] = [
    { id, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, listId, emptyId],
    },
    {
      id: titleId,
      component: 'Text',
      text: 'My booked flights',
      variant: 'h2',
    },
    {
      id: listId,
      component: 'Column',
      children: { componentId: rowId, path: `/${id}/flights` },
    },
    { id: rowId, component: 'Row', align: 'start', children: [colId] },
    {
      id: colId,
      component: 'Column',
      weight: 3,
      children: showCheckIn ? [routeId, metaId, btnId] : [routeId, metaId],
    },
    { id: routeId, component: 'Text', text: { path: 'route' }, variant: 'h3' },
    { id: metaId, component: 'Text', text: { path: 'meta' }, variant: 'body' },
    {
      id: emptyId,
      component: 'Text',
      text: { path: `/${id}/emptyMessage` },
      variant: 'body',
    },
  ];

  if (showCheckIn) {
    components.push(
      {
        id: btnId,
        component: 'Button',
        child: btnLabelId,
        action: {
          event: {
            name: 'checkIn',
            context: { flightId: { path: 'id' } },
          },
        },
      },
      { id: btnLabelId, component: 'Text', text: 'Check in' },
    );
  }

  return components;
}

export function buildFlightSearch(node: FlightSearchNode): A2uiComponent[] {
  const id = node.id;
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const fromId = `${id}-from`;
  const toId = `${id}-to`;
  const btnId = `${id}-btn`;
  const btnLabelId = `${btnId}-label`;
  const fromPath = `/${id}/search/from`;
  const toPath = `/${id}/search/to`;

  return [
    { id, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, fromId, toId, btnId],
    },
    { id: titleId, component: 'Text', text: 'Find a flight', variant: 'h2' },
    {
      id: fromId,
      component: 'TextField',
      label: 'From',
      value: { path: fromPath },
    },
    { id: toId, component: 'TextField', label: 'To', value: { path: toPath } },
    {
      id: btnId,
      component: 'Button',
      child: btnLabelId,
      action: {
        event: {
          name: 'dashboardFlightSearch',
          context: {
            from: { path: fromPath },
            to: { path: toPath },
          },
        },
      },
    },
    { id: btnLabelId, component: 'Text', text: 'Search' },
  ];
}

export function buildImageRowList(id: string): A2uiComponent[] {
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const listId = `${id}-list`;
  const rowId = `${id}-row`;
  const imgId = `${rowId}-img`;
  const colId = `${rowId}-col`;
  const itemTitleId = `${rowId}-title`;
  const subId = `${rowId}-sub`;

  return [
    { id, component: 'Card', child: bodyId },
    { id: bodyId, component: 'Column', children: [titleId, listId] },
    {
      id: titleId,
      component: 'Text',
      text: { path: `/${id}/title` },
      variant: 'h2',
    },
    {
      id: listId,
      component: 'Column',
      children: { componentId: rowId, path: `/${id}/items` },
    },
    { id: rowId, component: 'Row', align: 'start', children: [imgId, colId] },
    { id: imgId, component: 'Image', url: { path: 'image' }, weight: 1 },
    {
      id: colId,
      component: 'Column',
      weight: 3,
      children: [itemTitleId, subId],
    },
    {
      id: itemTitleId,
      component: 'Text',
      text: { path: 'title' },
      variant: 'h3',
    },
    {
      id: subId,
      component: 'Text',
      text: { path: 'subtitle' },
      variant: 'body',
    },
  ];
}

export function buildWeatherList(node: WeatherListNode): A2uiComponent[] {
  const id = node.id;
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const listId = `${id}-list`;
  const lineId = `${id}-line`;
  const emptyId = `${id}-empty`;

  return [
    { id, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, listId, emptyId],
    },
    {
      id: titleId,
      component: 'Text',
      text: 'Weather at your destinations',
      variant: 'h2',
    },
    {
      id: listId,
      component: 'Column',
      children: { componentId: lineId, path: `/${id}/items` },
    },
    { id: lineId, component: 'Text', text: { path: 'text' }, variant: 'body' },
    {
      id: emptyId,
      component: 'Text',
      text: { path: `/${id}/emptyMessage` },
      variant: 'body',
    },
  ];
}

function chartTile(id: string, title: string): A2uiComponent[] {
  const bodyId = `${id}-body`;
  const titleId = `${id}-title`;
  const imgId = `${id}-img`;
  return [
    { id, component: 'Card', child: bodyId },
    { id: bodyId, component: 'Column', children: [titleId, imgId] },
    { id: titleId, component: 'Text', text: title, variant: 'h2' },
    { id: imgId, component: 'Image', url: { path: `/${id}/chart` } },
  ];
}

function cellText(id: string, path: string): A2uiComponent {
  return {
    id,
    component: 'Text',
    text: { path },
    weight: 1,
  };
}

function headerText(id: string, label: string): A2uiComponent {
  return {
    id,
    component: 'Text',
    text: label,
    variant: 'h5',
    weight: 1,
  };
}
