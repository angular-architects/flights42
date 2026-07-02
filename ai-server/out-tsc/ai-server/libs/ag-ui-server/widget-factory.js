import { randomUUID } from 'node:crypto';
const BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';
export function buildA2UIFromBuilt(built) {
  const surfaceId = randomUUID();
  const rootChildren = built.map((entry) => entry.rootId);
  const surfaceRootId = 'root';
  const messages = [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: BASIC_CATALOG_ID,
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          {
            id: surfaceRootId,
            component: 'Column',
            children: rootChildren,
          },
          ...built.flatMap((entry) => entry.components),
        ],
      },
    },
    ...built
      .filter((entry) => Boolean(entry.dataModelUpdate))
      .map((entry) => ({
        version: 'v0.9',
        updateDataModel: {
          surfaceId,
          path: entry.dataModelUpdate.path,
          value: entry.dataModelUpdate.value,
        },
      })),
  ];
  return { surfaceId, messages };
}
export function buildA2UI(inputs, factories) {
  const built = inputs.map((input) => factories[input.type](input));
  return buildA2UIFromBuilt(built);
}
