import { Component, computed, input } from '@angular/core';
import {
  FieldTree,
  REQUIRED,
  MIN_LENGTH,
  MAX_LENGTH,
} from '@angular/forms/signals';
import { CITY, CITY2 } from '../flight-properties';

@Component({
  selector: 'app-field-meta-data-pane',
  imports: [],
  templateUrl: './field-meta-data-pane.html',
})
export class FieldMetaDataPane {
  field = input.required<FieldTree<unknown>>();

  fieldState = computed(() => this.field()());

  isRequired = computed(
    () => this.fieldState().metadata(REQUIRED)?.() ?? false,
  );
  minLength = computed(() => this.fieldState().metadata(MIN_LENGTH)?.() ?? 0);
  maxLength = computed(() => this.fieldState().metadata(MAX_LENGTH)?.() ?? 30);
  length = computed(() => `(${this.minLength()}..${this.maxLength()})`);

  city = computed(() => this.fieldState().metadata(CITY));
  city2 = computed(() => this.fieldState().metadata(CITY2));
}
