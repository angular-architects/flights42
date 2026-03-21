import { sameTag, SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'src/app/domains/<domain>': {
      'feature-<name>': ['domain:<domain>', 'type:feature'],
      'ui-<name>': ['domain:<domain>', 'type:ui'],
      'data-<name>': ['domain:<domain>', 'type:data'],
      'util-<name>': ['domain:<domain>', 'type:util'],
      'ai/<name>': ['domain:<domain>', 'type:ai'],

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

    'type:ai': ['type:ai', 'type:feature', 'type:ui', 'type:data', 'type:util'],

    'type:feature': ['type:ui', 'type:data', 'type:util'],
    'type:ui': ['type:ui', 'type:data', 'type:util'],
    'type:data': ['type:util'],
    'type:util': [],

    testing: '*',
    '*': ['testing'],
  },
};
