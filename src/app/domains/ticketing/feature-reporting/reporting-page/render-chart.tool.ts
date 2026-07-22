import { inject } from '@angular/core';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { ReportingChartStore } from './reporting-chart-store';

const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() })),
});

export const renderChartTool = createFrontendTool({
  name: 'renderChart',
  description:
    'Renders the supplied data as a bar chart in the user interface.',
  parameters: renderChartSchema,
  handler: async ({ title, data }) => {
    const store = inject(ReportingChartStore);
    store.setChart(title, data);
    return { ok: true };
  },
});
