import { SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'src/app/domains/luggage/feature-luggage': [
      'domain:luggage',
      'type:feature',
    ],
    'src/app/domains/luggage/data': ['domain:luggage', 'type:data'],
    'src/app/domains/checkin/feature-checkin': [
      'domain:checkin',
      'type:feature',
    ],
    'src/app/domains/checkin/data': ['domain:checkin', 'type:data'],
    'src/app/domains/ticketing/feature-dashboard': [
      'domain:ticketing',
      'type:feature',
    ],
    'src/app/domains/ticketing/feature-booking': [
      'domain:ticketing',
      'type:feature',
    ],

    // API
    'src/app/domains/ticketing/api': ['domain:ticketing/api', 'type:api'],

    'src/app/domains/ticketing/ui': ['domain:ticketing', 'type:ui'],
    'src/app/domains/ticketing/data': ['domain:ticketing', 'type:data'],
    'src/app/domains/ticketing/util': ['domain:ticketing', 'type:util'],
    'src/app/domains/ticketing/feature-next-flights': [
      'domain:ticketing',
      'type:feature',
    ],
    'src/app/shared/ui-common': ['shared', 'type:ui'],
    'src/app/shared/ui-common/delay-stepper': ['shared', 'type:ui'],
    'src/app/shared/ui-forms': ['shared', 'type:ui'],
    'src/app/shared/ui-forms/validation-errors': ['shared', 'type:ui'],
    'src/app/shared/ui-forms/field-meta-data-pane': ['shared', 'type:ui'],
    'src/app/shared/util-common': ['shared', 'type:util'],
    'src/app/testing': ['testing'],
  },
  depRules: {
    root: '*',

    'domain:luggage': ['domain:luggage', 'shared'],

    // API
    'domain:checkin': ['domain:checkin', 'domain:ticketing/api', 'shared'],
    // 'domain:checkin': ['domain:checkin', 'shared'],

    'domain:ticketing': ['domain:ticketing', 'shared'],

    // API
    'domain:ticketing/api': ['domain:ticketing', 'shared'],

    shared: ['shared'],

    // API
    'type:api': ['type:feature', 'type:ui', 'type:data', 'type:util'],

    'type:feature': ['type:api', 'type:ui', 'type:data', 'type:util'],
    'type:ui': ['type:data', 'type:util'],
    'type:data': ['type:util'],
    'type:util': [],

    testing: '*',
    '*': ['testing'],
  },
};
