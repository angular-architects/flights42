/**
 * Progress plumbing for the package tour workflow. These helpers surface
 * step boundaries and internal service calls to the AG-UI frontend so the user
 * can follow along live. They have no effect on the planning logic itself: when
 * no AG-UI bridge / writer is attached (e.g. a direct test run), the reports are
 * silently skipped. See libs/ag-ui-server/step-bridge.ts for the why.
 */
import { readBridge } from '@internal/ag-ui-server';

export interface StepProgressContext {
  writer?: { write: (chunk: unknown) => Promise<void> };
  requestContext?: Parameters<typeof readBridge>[0];
  stepName?: string;
}

export async function reportStepStatus(
  ctx: StepProgressContext,
  stepName: string,
  status: 'started' | 'finished',
  extras?: Record<string, unknown>,
): Promise<void> {
  const bridge = readBridge(ctx.requestContext);
  bridge?.emit({ stepName, kind: status, details: extras });

  await ctx.writer?.write({
    type: 'data-step-status',
    stepName,
    status,
    ...(extras ?? {}),
  });
}

export function reportToolCall(
  ctx: StepProgressContext,
  toolName: string,
  args: unknown,
  result: unknown,
): void {
  const bridge = readBridge(ctx.requestContext);
  bridge?.emitToolCall({
    toolName,
    args,
    result,
    stepName: ctx.stepName,
  });
}
