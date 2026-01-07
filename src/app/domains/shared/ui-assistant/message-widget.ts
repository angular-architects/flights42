import { exposeComponent } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { MessageComponent } from './message';

export const messageWidget = exposeComponent(MessageComponent, {
  name: 'messageWidget',
  description: 'Displays a message to the user',
  input: {
    data: s.string('Plain text or markdown to be displayed to the user.'),
  },
});
