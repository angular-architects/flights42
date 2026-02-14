import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Component, contentChildren, input } from '@angular/core';

// import { CustomTemplateOutlet } from '../custom-template-outlet.directive';
import { TableField } from './table-field.directive';

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, NgTemplateOutlet],
  template: `
    <table class="table">
      <tr>
        @for (f of fields(); track f) {
          <th>
            {{ f.title() }}
          </th>
        }
      </tr>

      @for (row of data(); track row) {
        <tr>
          @for (f of fields(); track f) {
            <td>
              <ng-container
                *ngTemplateOutlet="
                  f.templateRef;
                  context: { $implicit: row[f.propName()] }
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
