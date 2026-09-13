import type { Middleware } from '@ag-ui/client';

export interface AgUiRouteConfig {
  middlewares?: readonly Middleware[];
  untilIdle?: boolean;
}

export const agUiRouteConfig: Record<string, AgUiRouteConfig> = {};
