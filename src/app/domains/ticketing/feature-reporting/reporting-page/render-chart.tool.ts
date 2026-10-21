import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createRenderToolCall } from '../../../shared/util-copilotkit/tool-definition';
import { ReportingChartStore } from './reporting-chart-store';

const executeJavaScriptArgsSchema = z.object({
  code: z.string(),
  title: z.string(),
});

export type ExecuteJavaScriptArgs = z.infer<typeof executeJavaScriptArgsSchema>;

const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number() })),
});

export type RenderChartResult = z.infer<typeof renderChartSchema>;

@Component({
  selector: 'app-render-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class RenderChart implements ToolRenderer<ExecuteJavaScriptArgs> {
  readonly toolCall = input.required<AngularToolCall<ExecuteJavaScriptArgs>>();

  private readonly result = computed(() => this.toolCall().result);

  constructor() {
    const store = inject(ReportingChartStore);
    effect(() => {
      const chart = parseResult(this.result());
      if (chart) {
        store.setChart(chart.title, chart.data);
      }
    });
  }
}

export const renderChartToolCall = createRenderToolCall({
  name: 'executeJavaScript',
  args: executeJavaScriptArgsSchema,
  component: RenderChart,
});

function parseResult(result: string | undefined): RenderChartResult | null {
  if (!result) {
    return null;
  }
  try {
    const parsed = renderChartSchema.safeParse(JSON.parse(result));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
