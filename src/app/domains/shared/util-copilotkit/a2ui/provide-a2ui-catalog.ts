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

import {
  type A2uiCustomCatalog,
  type A2uiCustomCatalogComponent,
  type A2uiCustomCatalogFunction,
} from './types';

/**
 * The registered custom catalog. `initAgentStore` injects it optionally, so an
 * app without a custom catalog needs no provider and its agents get no catalog
 * context entry.
 */
export const A2UI_CUSTOM_CATALOG = new InjectionToken<A2uiCustomCatalog>(
  'A2UI_CUSTOM_CATALOG',
);

/**
 * Whether agent stores may forward the full catalog descriptor to their agent.
 * `initAgentStore` reads this token and falls back to an id-only context entry
 * when it is `false`.
 */
export const A2UI_SEND_CATALOG_DESCRIPTION = new InjectionToken<boolean>(
  'A2UI_SEND_CATALOG_DESCRIPTION',
  { providedIn: 'root', factory: () => true },
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
    schema: entry.schema as unknown,
  } as AngularComponentImplementation;
}

function toFunctionImplementation(
  fn: A2uiCustomCatalogFunction,
): FunctionImplementation {
  const implementation: FunctionImplementation = {
    name: fn.name,
    returnType: fn.returnType,
    schema: fn.schema as unknown as FunctionImplementation['schema'],
    execute: (args: Record<string, unknown>) =>
      fn.execute(fn.schema.parse(args)),
  };
  return implementation;
}

/**
 * Sets up the A2UI renderer for the application.
 *
 * Without a catalog only the standard `BasicCatalog` (BASIC_COMPONENTS +
 * BASIC_FUNCTIONS) is wired into the renderer.
 *
 * With a catalog a `BasicCatalogBase` (auto-merging `BASIC_FUNCTIONS`) is built
 * and registered at `A2UI_RENDERER_CONFIG`, and the catalog is stored at
 * `A2UI_CUSTOM_CATALOG` so `initAgentStore` can forward it to every agent it
 * registers. Set `options.sendCatalogDescription: false` to forward only the
 * catalog id (recommended for production with a trusted server-side registry).
 */
export function provideA2uiCatalog(
  catalog?: A2uiCustomCatalog,
  options?: ProvideA2uiCatalogOptions,
): EnvironmentProviders {
  const { sendCatalogDescription = true } = options ?? {};

  if (!catalog) {
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

  return makeEnvironmentProviders([
    { provide: A2UI_CUSTOM_CATALOG, useValue: catalog },
    {
      provide: A2UI_SEND_CATALOG_DESCRIPTION,
      useValue: sendCatalogDescription,
    },
    { provide: A2UI_RENDERER_CONFIG, useValue: rendererConfig },
    A2uiRendererService,
  ]);
}
