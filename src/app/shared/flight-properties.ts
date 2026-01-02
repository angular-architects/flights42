import { createMetadataKey, MetadataReducer } from '@angular/forms/signals';

export const CITY = createMetadataKey<boolean>();

export const CITY2 = createMetadataKey(MetadataReducer.or());
