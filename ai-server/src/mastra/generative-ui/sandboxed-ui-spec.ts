import { z } from 'zod';

export const GENERATE_SANDBOXED_UI_TOOL_NAME = 'generateSandboxedUi';

export const sandboxedUiSpecSchema = z.object({
  initialHeight: z.number().optional(),
  placeholderMessages: z.array(z.string()).optional(),
  css: z.string().optional(),
  html: z.string(),
  jsFunctions: z.string().optional(),
  jsExpressions: z.array(z.string()).optional(),
});

export type SandboxedUiSpec = z.infer<typeof sandboxedUiSpecSchema>;
