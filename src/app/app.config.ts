import { DEFAULT_CATALOG, provideA2UI, Theme } from '@a2ui/angular';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { provideMarkdown } from 'ngx-markdown';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';

const emptyClasses: Record<string, boolean> = {};

const a2uiTheme: Theme = {
  components: {
    AudioPlayer: emptyClasses,
    Button: emptyClasses,
    Card: emptyClasses,
    Column: emptyClasses,
    CheckBox: {
      container: emptyClasses,
      element: emptyClasses,
      label: emptyClasses,
    },
    DateTimeInput: {
      container: emptyClasses,
      element: emptyClasses,
      label: emptyClasses,
    },
    Divider: emptyClasses,
    Image: {
      all: emptyClasses,
      icon: emptyClasses,
      avatar: emptyClasses,
      smallFeature: emptyClasses,
      mediumFeature: emptyClasses,
      largeFeature: emptyClasses,
      header: emptyClasses,
    },
    Icon: emptyClasses,
    List: emptyClasses,
    Modal: { backdrop: emptyClasses, element: emptyClasses },
    MultipleChoice: {
      container: emptyClasses,
      element: emptyClasses,
      label: emptyClasses,
    },
    Row: emptyClasses,
    Slider: {
      container: emptyClasses,
      element: emptyClasses,
      label: emptyClasses,
    },
    Tabs: {
      container: emptyClasses,
      element: emptyClasses,
      controls: { all: emptyClasses, selected: emptyClasses },
    },
    Text: {
      all: emptyClasses,
      h1: emptyClasses,
      h2: emptyClasses,
      h3: emptyClasses,
      h4: emptyClasses,
      h5: emptyClasses,
      caption: emptyClasses,
      body: emptyClasses,
    },
    TextField: {
      container: emptyClasses,
      element: emptyClasses,
      label: emptyClasses,
    },
    Video: emptyClasses,
  },
  elements: {
    a: emptyClasses,
    audio: emptyClasses,
    body: emptyClasses,
    button: emptyClasses,
    h1: emptyClasses,
    h2: emptyClasses,
    h3: emptyClasses,
    h4: emptyClasses,
    h5: emptyClasses,
    iframe: emptyClasses,
    input: emptyClasses,
    p: emptyClasses,
    pre: emptyClasses,
    textarea: emptyClasses,
    video: emptyClasses,
  },
  markdown: {
    p: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    ul: [],
    ol: [],
    li: [],
    a: [],
    strong: [],
    em: [],
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    // provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideA2UI({ catalog: DEFAULT_CATALOG, theme: a2uiTheme }),
    provideHashbrown({
      baseUrl: 'http://localhost:3000/api/chat',
      emulateStructuredOutput: true,
      middleware: [
        (request) => {
          console.log('[Hashbrown Request]', request);
          return request;
        },
      ],
    }),
    provideMarkdown(),
  ],
};
