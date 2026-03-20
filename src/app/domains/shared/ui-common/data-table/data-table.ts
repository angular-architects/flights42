import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChildren, input } from '@angular/core';

// import { CustomTemplateOutlet } from '../custom-template-outlet';
import { TableField } from './table-field';

@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  template: `
    <table class="table">
      <tr>
        @for (field of fields(); track field) {
          <th>
            {{ field.title() }}
          </th>
        }
      </tr>

      @for (row of data(); track row) {
        <tr>
          @for (field of fields(); track field) {
            <td>
              <ng-container
                *ngTemplateOutlet="
                  field.templateRef;
                  context: { $implicit: row[field.propName()] }
                "></ng-container>
            </td>
          }
        </tr>
      }
    </table>
  `,
})
export class DataTable<T extends object> {
  readonly data = input<T[]>([]);
  protected readonly fields = contentChildren<TableField<T>>(TableField);
}
