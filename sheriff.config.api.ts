import { sameTag, SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'src/app/domains/<domain>': {
      'feature-<name>': ['domain:<domain>', 'type:feature'],
      'ui-<name>': ['domain:<domain>', 'type:ui'],
      'data-<name>': ['domain:<domain>', 'type:data'],
      'util-<name>': ['domain:<domain>', 'type:util'],

      data: ['domain:<domain>', 'type:data'],
      ui: ['domain:<domain>', 'type:ui'],
      util: ['domain:<domain>', 'type:util'],

      // AI
      ai: ['domain:<domain>', 'type:ai'],

      // API
      api: ['domain:<domain>/api', 'type:api'],
    },

    'src/app/testing': ['testing'],
  },
  depRules: {
    root: '*',

    'domain:*': [sameTag, 'domain:shared'],

    'type:ai': [
      /* API --> */ 'type:api',
      'type:feature',
      'type:ui',
      'type:data',
      'type:util',
    ],

    'type:feature': [
      /* API --> */ 'type:api',
      'type:ui',
      'type:data',
      'type:util',
    ],
    'type:ui': ['type:data', 'type:util'],
    'type:data': ['type:util'],
    'type:util': [],

    // API
    'type:api': ['type:feature', 'type:ui', 'type:data', 'type:util'],
    'domain:ticketing/api': ['domain:ticketing', 'domain:shared'],
    'domain:checkin': [
      'domain:checkin',
      'domain:ticketing/api',
      'domain:shared',
    ],

    testing: '*',
    '*': ['testing'],
  },
};
