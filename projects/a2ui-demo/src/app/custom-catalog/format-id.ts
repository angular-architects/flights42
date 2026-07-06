import {
  createFunctionImplementation,
  type FunctionImplementation,
} from '@a2ui/web_core/v0_9';
import { z } from 'zod/v3';

const formatIdSchema = z
  .object({
    value: z.number(),
  })
  .strict();

export const formatIdImplementation = createFunctionImplementation(
  {
    name: 'formatId',
    returnType: 'string',
    schema: formatIdSchema as unknown as FunctionImplementation['schema'],
  },
  ({ value }) => {
    const normalizedValue = Math.max(0, Math.trunc(value));

    return `P-${String(normalizedValue).padStart(4, '0')}`;
  },
);
