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

const a2uiTheme = {
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
  additionalStyles: {
    Card: {
      padding: '0.72rem 0.9rem',
      border: '1px solid #dbe3ff',
      borderRadius: '1rem',
      background: '#ffffff',
      boxShadow: '0 6px 16px rgba(15, 23, 42, 0.07)',
      display: 'grid',
      gap: '10px',
      width: '250px',
      minWidth: '250px',
      maxWidth: '250px',
      boxSizing: 'border-box',
      marginTop: '0',
      marginBottom: '0',
    },
    Button: {
      border: 'none',
      borderRadius: '9999px',
      padding: '0.12rem 0.9rem',
      minHeight: 'unset',
      background: '#7476bf',
      color: '#ffffff',
      fontWeight: '700',
      boxShadow: '0 3px 8px rgba(73, 76, 148, 0.28)',
      fontSize: '1rem',
      lineHeight: '1.1',
      cursor: 'pointer',
      marginTop: '10px',
    },
    Column: {
      gap: '0.08rem',
    },
    Divider: {
      margin: '0.14rem 0',
    },
    TextField: {
      border: '1px solid #cbd5e1',
      borderRadius: '0.75rem',
      padding: '0.7rem 0.85rem',
      background: '#ffffff',
      fontSize: '1rem',
      lineHeight: '1.4',
    },
    Text: {
      h1: {
        fontSize: '2.4rem',
        fontWeight: '700',
        color: '#131722',
      },
      h2: {
        fontSize: '2.05rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: '#131722',
        lineHeight: '1.12',
      },
      h3: {
        fontSize: '1.42rem',
        fontWeight: '700',
        color: '#131722',
        lineHeight: '1.26',
      },
      h4: {
        fontSize: '1.04rem',
        fontWeight: '500',
        color: '#1e293b',
        lineHeight: '1.3',
      },
      h5: {
        fontSize: '1rem',
        fontWeight: '500',
        color: '#242936',
        lineHeight: '1.3',
      },
      h6: {},
      body: {
        fontSize: '1rem',
        lineHeight: '1.34',
      },
      caption: {
        fontSize: '0.96rem',
        color: '#5f636f',
        fontStyle: 'normal',
        lineHeight: '1.3',
      },
    },
  },
} as Theme;

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
