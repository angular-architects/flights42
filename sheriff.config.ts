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

      // API
      api: ['domain:<domain>/api', 'type:api'],
    },

    'src/app/shared': {
      'feature-<name>': ['shared', 'type:feature'],
      'ui-<name>': ['shared', 'type:ui'],
      'data-<name>': ['shared', 'type:data'],
      'util-<name>': ['shared', 'type:util'],

      data: ['shared', 'type:data'],
      ui: ['shared', 'type:ui'],
      util: ['shared', 'type:util'],
    },

    'src/app/testing': ['testing'],
  },
  depRules: {
    root: '*',

    'domain:*': [sameTag, 'shared'],
    shared: ['shared'],

    'type:feature': [
      'type:api',
      /* <-- API */ 'type:ui',
      'type:data',
      'type:util',
    ],
    'type:ui': ['type:data', 'type:util'],
    'type:data': ['type:util'],
    'type:util': [],

    // API
    'type:api': ['type:feature', 'type:ui', 'type:data', 'type:util'],
    'domain:ticketing/api': ['domain:ticketing', 'shared'],
    'domain:checkin': ['domain:checkin', 'domain:ticketing/api', 'shared'],

    testing: '*',
    '*': ['testing'],
  },
};
