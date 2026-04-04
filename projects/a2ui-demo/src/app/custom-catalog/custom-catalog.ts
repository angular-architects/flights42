import {
  type Catalog,
  type CatalogEntry,
  DEFAULT_CATALOG,
} from '@a2ui/angular';
import { type Primitives, type Types } from '@a2ui/lit/0.8';
import { inputBinding } from '@angular/core';

import { MilesProgress } from './miles-progress';

interface MilesProgressProperties {
  label: Primitives.StringValue | null;
  miles: Primitives.NumberValue | null;
}

const milesProgressEntry: CatalogEntry<Types.AnyComponentNode> = {
  type: () => MilesProgress,
  bindings: (node) => {
    const properties = node.properties as MilesProgressProperties;

    return [
      inputBinding('label', () => properties.label),
      inputBinding('miles', () => properties.miles),
    ];
  },
};

export const customCatalog: Catalog = {
  ...DEFAULT_CATALOG,
  MilesProgress: milesProgressEntry,
};
