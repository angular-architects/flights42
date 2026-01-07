import { sameTag, SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'libs/<domain>': {
      'feature-<name>/src': ['domain:<domain>', 'type:feature'],
      'ui-<name>/src': ['domain:<domain>', 'type:ui'],
      'data-<name>/src': ['domain:<domain>', 'type:data'],
      'util-<name>/src': ['domain:<domain>', 'type:util'],

      'data/src': ['domain:<domain>', 'type:data'],
      'ui/src': ['domain:<domain>', 'type:ui'],
      'util/src': ['domain:<domain>', 'type:util'],
    },

    'src/app/domains/<domain>': {
      'feature-<name>': ['domain:<domain>', 'type:feature'],
      'ui-<name>': ['domain:<domain>', 'type:ui'],
      'data-<name>': ['domain:<domain>', 'type:feature'],
      'util-<name>': ['domain:<domain>', 'type:util'],

      data: ['domain:<domain>', 'type:data'],
      ui: ['domain:<domain>', 'type:ui'],
      util: ['domain:<domain>', 'type:util'],

      ai: ['domain:<domain>', 'type:ai'],
    },

    'src/app/testing': ['testing'],
  },
  depRules: {
    root: '*',

    'domain:*': [sameTag, 'domain:shared'],

    'type:ai': ['type:feature', 'type:ui', 'type:data', 'type:util'],

    'type:feature': ['type:ui', 'type:data', 'type:util'],
    'type:app': ['type:feature', 'type:ui', 'type:data', 'type:util'],

    'type:ui': ['type:data', 'type:util'],
    'type:data': ['type:util'],
    'type:util': [],

    testing: '*',
    '*': ['testing'],
  },
};
