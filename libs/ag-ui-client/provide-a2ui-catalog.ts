import {
  A2UI_RENDERER_CONFIG,
  A2uiRendererService,
  type AngularComponentImplementation,
  BASIC_FUNCTIONS,
  BasicCatalog,
  BasicCatalogBase,
  type RendererConfiguration,
} from '@a2ui/angular/v0_9';
import type { FunctionImplementation } from '@a2ui/web_core/v0_9';
import {
  type EnvironmentProviders,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import type { ZodTypeAny } from 'zod';

import {
  type A2uiCustomCatalog,
  type A2uiCustomCatalogComponent,
} from './ag-ui-types';
import { type A2uiCustomCatalogFunction } from './a2ui-schema';

/**
 * Holds the descriptor of the registered A2UI custom catalog so consumers
 * (e.g. `agUiResource`) can include it in the LLM context.
 */
export const A2UI_CUSTOM_CATALOG = new InjectionToken<A2uiCustomCatalog>(
  'A2UI_CUSTOM_CATALOG',
);

export interface ProvideA2uiCatalogOptions {
  /**
   * If `true` (default) the agent receives the full catalog descriptor
   * (component + function metadata + schemas) in its context.
   *
   * If `false` only the catalog id is forwarded to the agent. Use this in
   * production setups where the server should look up the trusted catalog
   * descriptor from its own registry instead of trusting client-supplied
   * metadata.
   */
  sendCatalogDescription?: boolean;
}

function toAngularComponentImplementation(
  entry: A2uiCustomCatalogComponent,
): AngularComponentImplementation {
  return {
    name: entry.name,
    component: entry.component,
    schema: entry.schema,
  } as unknown as AngularComponentImplementation;
}

function toFunctionImplementation(
  fn: A2uiCustomCatalogFunction,
): FunctionImplementation {
  return {
    name: fn.name,
    returnType: fn.returnType,
    schema: fn.schema as unknown as ZodTypeAny,
    execute: (args: Record<string, unknown>) =>
      fn.execute(fn.schema.parse(args)),
  } as unknown as FunctionImplementation;
}

/**
 * Registers an A2UI catalog for both the renderer and the AG-UI agent runtime
 * in a single call.
 *
 * Without arguments only the standard `BasicCatalog` (BASIC_COMPONENTS +
 * BASIC_FUNCTIONS) is wired into the renderer; no catalog descriptor is
 * forwarded to the agent.
 *
 * With a descriptor a `BasicCatalogBase` (auto-merging `BASIC_FUNCTIONS`) is
 * built, registered at `A2UI_RENDERER_CONFIG`, and the descriptor is stored
 * at `A2UI_CUSTOM_CATALOG` so `agUiResource` can forward catalog metadata to
 * the agent. Set `sendCatalogDescription: false` to forward only the catalog
 * id (recommended for production with a trusted server-side registry).
 */
export function provideA2uiCatalog(
  catalogWithOptions?: A2uiCustomCatalog & ProvideA2uiCatalogOptions,
): EnvironmentProviders {
  if (!catalogWithOptions) {
    return makeEnvironmentProviders([
      {
        provide: A2UI_RENDERER_CONFIG,
        useFactory: (): RendererConfiguration => ({
          catalogs: [inject(BasicCatalog)],
        }),
      },
      A2uiRendererService,
    ]);
  }

  const { sendCatalogDescription = true, ...catalog } = catalogWithOptions;

  const rendererCatalog = new BasicCatalogBase({
    id: catalog.id,
    extraComponents: catalog.components.map(toAngularComponentImplementation),
    functions: [
      ...BASIC_FUNCTIONS,
      ...(catalog.functions ?? []).map(toFunctionImplementation),
    ],
  });

  const rendererConfig: RendererConfiguration = {
    catalogs: [rendererCatalog],
  };

  // When the description must not leave the client, we strip components and
  // functions from the descriptor stored at the token. The renderer keeps the
  // full catalog above, so local rendering is unaffected.
  const storedCatalog: A2uiCustomCatalog = sendCatalogDescription
    ? catalog
    : { id: catalog.id, components: [] };

  return makeEnvironmentProviders([
    { provide: A2UI_CUSTOM_CATALOG, useValue: storedCatalog },
    { provide: A2UI_RENDERER_CONFIG, useValue: rendererConfig },
    A2uiRendererService,
  ]);
}
