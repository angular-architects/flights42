/**
 * Progress plumbing for the package tour workflow. These helpers surface
 * step boundaries and internal service calls to the AG-UI frontend so the user
 * can follow along live. They have no effect on the planning logic itself: when
 * no AG-UI bridge is attached (e.g. a direct test run), the reports are
 * silently skipped. See libs/ag-ui-server/step-bridge.ts for the why.
 */
import { getBridge } from '@internal/ag-ui-server';

export interface StepProgressContext {
  requestContext?: Parameters<typeof getBridge>[0];
  stepName?: string;
}

export function reportStepStatus(
  ctx: StepProgressContext,
  stepName: string,
  status: 'started' | 'finished',
  extras?: Record<string, unknown>,
): void {
  getBridge(ctx.requestContext)?.emit({
    stepName,
    kind: status,
    details: extras,
  });
}

export function reportToolCall(
  ctx: StepProgressContext,
  toolName: string,
  args: unknown,
  result: unknown,
): void {
  getBridge(ctx.requestContext)?.emitToolCall({
    toolName,
    args,
    result,
    stepName: ctx.stepName,
  });
}
