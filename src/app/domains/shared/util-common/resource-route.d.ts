import { Resource } from '@angular/core';
import {
  ɵResourceContext as ResourceContext,
  ɵResourceResult as ResourceResult,
} from '@angular/router';

// Router Resources are experimental in Angular 22: the runtime evaluates
// Route.resources and exposes the created resources via ActivatedRoute.resources,
// but neither property is part of the public types yet.
declare module '@angular/router' {
  interface Route {
    resources?: (
      ctx: ResourceContext,
    ) => ResourceResult | Promise<ResourceResult>;
  }

  interface ActivatedRoute {
    // Router Resources can be reloaded, which ResourceResult does not express
    resources?: Record<string, Resource<unknown> & { reload(): boolean }>;
  }
}
