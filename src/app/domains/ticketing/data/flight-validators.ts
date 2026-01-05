import { rxResource } from '@angular/core/rxjs-interop';
import {
  metadata,
  SchemaPath,
  validate,
  validateAsync,
  validateHttp,
  validateTree,
} from '@angular/forms/signals';
import { delay, map, Observable, of } from 'rxjs';

import { CITY, CITY2 } from '../../../shared/util-common/properties';
import { Flight } from './flight';
import { Price } from './price';

export function validateCity(path: SchemaPath<string>, allowed: string[]) {
  validate(path, (ctx) => {
    const value = ctx.value();
    if (allowed.includes(value)) {
      return null;
    }

    return {
      kind: 'city',
      value,
      allowed,
    };
  });
}

export function validateRoundTrip(schema: SchemaPath<Flight>) {
  validate(schema, (ctx) => {
    const from = ctx.fieldTree.from().value();
    const to = ctx.fieldTree.to().value();

    if (from === to) {
      return {
        kind: 'roundtrip',
        from,
        to,
      };
    }
    return null;
  });
}

export function validateRoundTripTree(schema: SchemaPath<Flight>) {
  validateTree(schema, (ctx) => {
    const from = ctx.fieldTree.from().value();
    const to = ctx.fieldTree.to().value();

    if (from === to) {
      return {
        kind: 'roundtrip_tree',
        field: ctx.fieldTree.from,
        from,
        to,
      };
    }
    return null;
  });
}

export function validateCityAsync(schema: SchemaPath<string>) {
  metadata(schema, CITY2, () => true);

  validateAsync(schema, {
    params: (ctx) => ({
      value: ctx.value(),
    }),
    factory: (params) => {
      return rxResource({
        params,
        stream: (p) => {
          return rxValidateAirport(p.params.value);
        },
      });
    },
    onSuccess: (result: boolean, _ctx) => {
      if (!result) {
        return {
          kind: 'airport_not_found_http',
        };
      }
      return null;
    },
    onError: (error, _ctx) => {
      console.error('api error validating city', error);
      return {
        kind: 'api-failed',
      };
    },
  });
}

function rxValidateAirport(airport: string): Observable<boolean> {
  const allowed = ['Graz', 'Hamburg', 'Zürich'];
  return of(null).pipe(
    delay(2000),
    map(() => allowed.includes(airport)),
  );
}

export function validateCityHttp(schema: SchemaPath<string>) {
  metadata(schema, CITY, () => true);

  validateHttp(schema, {
    request: (ctx) => ({
      url: 'https://demo.angulararchitects.io/api/flight',
      params: {
        from: ctx.value(),
      },
    }),
    onSuccess: (result: Flight[], _ctx) => {
      if (result.length === 0) {
        return {
          kind: 'airport_not_found_http',
        };
      }
      return null;
    },
    onError: (error, _ctx) => {
      console.error('api error validating city', error);
      return {
        kind: 'api-failed',
      };
    },
  });
}

// Simulates a serverside validation

export function validateDuplicatePrices(prices: SchemaPath<Price[]>) {
  validate(prices, (ctx) => {
    const prices = ctx.value();
    const flightClasses = new Set<string>();

    for (const price of prices) {
      if (flightClasses.has(price.flightClass)) {
        return {
          kind: 'duplicateFlightClass',
          message: 'There can only be one price per flight class',
          flightClass: price.flightClass,
        };
      }
      flightClasses.add(price.flightClass);
    }

    return null;
  });
}
