import { createOpenAI } from '@ai-sdk/openai';
import type { MastraModelConfig } from '@mastra/core/llm';

const THINKING = process.env['MODEL_THINKING'] === 'true';

export const MODEL_ID = '@cf/google/gemma-4-26b-a4b-it';

const REQUEST_TIMEOUT_MS = 60_000;

// Mastra's model router merges parallel tool calls from Cloudflare, which
// all arrive with index 0. The OpenAI provider keeps them apart, but drops
// unknown provider options, so the fetch adds chat_template_kwargs itself.
const cloudflare = createOpenAI({
  name: 'cloudflare-workers-ai',
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env['CLOUDFLARE_ACCOUNT_ID']}/ai/v1`,
  apiKey: process.env['CLOUDFLARE_API_TOKEN'],
  fetch: (url, init) => fetch(url, withTimeout(withChatTemplateKwargs(init))),
});

export const model: MastraModelConfig = cloudflare.chat(MODEL_ID);

export const defaultOptions = {
  maxSteps: 8,
  modelSettings: {
    temperature: Number(process.env['CLOUDFLARE_TEMPERATURE'] ?? 0),
    maxOutputTokens: 4096,
  },
};

function withTimeout(init: RequestInit): RequestInit {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return {
    ...init,
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  };
}

function withChatTemplateKwargs(init: RequestInit | undefined): RequestInit {
  if (typeof init?.body !== 'string') {
    return init ?? {};
  }
  const body = JSON.parse(init.body) as Record<string, unknown>;
  return {
    ...init,
    body: JSON.stringify({
      ...body,
      chat_template_kwargs: { enable_thinking: THINKING },
    }),
  };
}
