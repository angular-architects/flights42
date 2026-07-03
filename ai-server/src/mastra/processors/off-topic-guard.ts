import { ModerationProcessor } from '@mastra/core/processors';

import { model } from '../config.js';

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
