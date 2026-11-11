import { defineMacro } from '../a2ui/simple-macros/macro.js';
import { flightRouteSchema } from './dashboard-spec.js';

export const demoMacros = {
  FlightRoute: defineMacro({
    schema: flightRouteSchema,
    load: async (node) => {
      return { flightId: String(node.flightId), route: 'Graz → Hamburg' };
    },
    render: (node) => {
      const idText = `${node.id}-id`;
      const routeText = `${node.id}-route`;
      return [
        { id: node.id, component: 'Row', children: [idText, routeText] },
        {
          id: idText,
          component: 'Text',
          text: { path: `/${node.id}/flightId` },
        },
        {
          id: routeText,
          component: 'Text',
          text: { path: `/${node.id}/route` },
        },
      ];
    },
  }),
};
