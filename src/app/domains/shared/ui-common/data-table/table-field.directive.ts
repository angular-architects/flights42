import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableField]',
})
export class TableFieldDirective<T> {
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly propName = input.required<keyof T>({ alias: 'appTableFieldAs' });
  readonly templateRef = inject(TemplateRef) as TemplateRef<unknown>;
}
