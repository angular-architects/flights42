import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableField]',
})
export class TableFieldDirective<T> {
  readonly propName = input.required<keyof T>({
    // eslint-disable-next-line @angular-eslint/no-input-rename
    alias: 'appTableFieldProvide',
  });
  readonly title = input.required<string>({ alias: 'appTableFieldTitle' });
  readonly templateRef = inject(TemplateRef) as TemplateRef<unknown>;
}
