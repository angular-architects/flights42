import { Type } from '@angular/core';
import type { z as z3 } from 'zod/v3';

import { type A2uiCustomCatalogFunction } from './a2ui-schema';

/**
 * Legacy A2UI catalog types. The AG-UI runtime client that used to live here has
 * been replaced by `@copilotkit/angular`; only the A2UI custom-catalog metadata
 * that the still-supported `provideA2uiCatalog(...)` path needs remains.
 */
export interface A2uiCustomCatalogComponent {
  name: string;
  description: string;
  component: Type<unknown>;
  schema: z3.ZodTypeAny;
}

export interface A2uiCustomCatalog {
  id: string;
  components: A2uiCustomCatalogComponent[];
  functions?: A2uiCustomCatalogFunction[];
}

export function createCustomCatalog<const TCatalog extends A2uiCustomCatalog>(
  catalog: TCatalog,
): TCatalog {
  return catalog;
}
