import { createMetadataKey, MetadataReducer } from '@angular/forms/signals';

export const CITY = createMetadataKey<boolean>();

export const CITY2 = createMetadataKey(MetadataReducer.or());

const myOr: MetadataReducer<boolean, boolean> = {
  reduce(acc, item) {
    return acc || item;
  },
  getInitial() {
    return false;
  },
};

export const CITY3 = createMetadataKey(myOr);
