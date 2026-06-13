import { ModerationProcessor } from '@mastra/core/processors';

import { model } from '../config.js';

/**
 * Input guard that blocks off-topic requests (e.g. jokes, general knowledge,
 * coding help) before they reach the LLM. Built on the built-in
 * ModerationProcessor with a custom `off-topic` category and `strategy: 'block'`,
 * so flagged requests abort the run via tripwire.
 */
export const offTopicGuard = new ModerationProcessor({
  model,
  categories: ['off-topic'],
  threshold: 0.6,
  strategy: 'block',
  instructions:
    'You guard "Flight42", an assistant for flights and bookings. ' +
    'Score category "off-topic" from 0 to 1: 1 means the request has ' +
    'nothing to do with flights, bookings, check-in or travel ' +
    '(e.g. jokes, general knowledge, coding help). Flight- or ' +
    'booking-related requests get a low score.',
});
