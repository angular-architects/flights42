/**
 * Progress plumbing for the package tour workflow. These helpers surface
 * step boundaries and internal service calls to the AG-UI frontend so the user
 * can follow along live. They have no effect on the planning logic itself: when
 * no AG-UI bridge / writer is attached (e.g. a direct test run), the reports are
 * silently skipped. See libs/ag-ui-server/step-bridge.ts for the why.
 */
import { getBridge } from '@internal/ag-ui-server';
export async function reportStepStatus(ctx, stepName, status, extras) {
  const bridge = getBridge(ctx.requestContext);
  bridge?.emit({ stepName, kind: status, details: extras });
  await ctx.writer?.write({
    type: 'data-step-status',
    stepName,
    status,
    ...(extras ?? {}),
  });
}
export function reportToolCall(ctx, toolName, args, result) {
  const bridge = getBridge(ctx.requestContext);
  bridge?.emitToolCall({
    toolName,
    args,
    result,
    stepName: ctx.stepName,
  });
}
