import type { OutputProcessor } from '@mastra/core/processors';

import { readPlan } from '../tools/plan/plan-store.js';
import { validatePlan } from '../tools/plan/validate-plan.js';

const MAX_RETRIES = 2;

export const planValidationGuardrail: OutputProcessor = {
  id: 'plan-validation-guardrail',
  processOutputStep(args) {
    if (args.finishReason !== 'stop') {
      return args.messages;
    }

    const { valid, errors } = validatePlan(readPlan(args.requestContext));
    if (!valid) {
      args.abort(
        `The travel plan is invalid:\n- ${errors.join('\n- ')}\n` +
          `Fix it with the plan tools, then finish.`,
        { retry: args.retryCount < MAX_RETRIES },
      );
    }

    return args.messages;
  },
};
