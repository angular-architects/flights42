import type { FunctionImplementation } from '@a2ui/web_core/v0_9';
import { z, type ZodTypeAny } from 'zod/v3';

const formatIdSchema = z
  .object({
    value: z.number(),
  })
  .strict();

export const formatIdImplementation = {
  name: 'formatId',
  returnType: 'string',
  schema: formatIdSchema as unknown as ZodTypeAny,
  execute: (args: Record<string, unknown>) => {
    const { value } = formatIdSchema.parse(args);
    const normalizedValue = Math.max(0, Math.trunc(value));

    return `P-${String(normalizedValue).padStart(4, '0')}`;
  },
} as unknown as FunctionImplementation;
