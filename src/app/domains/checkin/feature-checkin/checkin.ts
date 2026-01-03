import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Field, required } from '@angular/forms/signals';
import { compatForm } from '@angular/forms/signals/compat';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CheckinForm } from '../data/checkin-form';
import { initPassengerForm, PassengerForm } from '../data/passenger-form';
import { CheckinDialogComponent } from './checkin-dialog';

@Component({
  selector: 'app-checkin',
  imports: [Field, ReactiveFormsModule, RouterLink, JsonPipe],
  templateUrl: './checkin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkin {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private formBuilder = inject(FormBuilder);

  protected readonly passengerGroup =
    this.formBuilder.nonNullable.group<PassengerForm>({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'me@here.com',
    });

  protected readonly checkinFormModel = signal({
    ticketId: '',
    conditionsAccepted: false,
    passenger: this.passengerGroup,
  });

  protected readonly checkinForm = compatForm(this.checkinFormModel, (path) => {
    required(path.ticketId);
  });

  protected readonly expertMode = input.required({
    transform: custonBooleanAttribute,
  });

  protected readonly ticketId = signal<number | undefined>(undefined);

  constructor() {
    this.passengerGroup.controls.email.addValidators([
      Validators.required,
      Validators.minLength(3),
      Validators.email,
    ]);

    this.activatedRoute.paramMap.subscribe((paramMap) => {
      console.log('paramMap', paramMap);
      const ticketId = parseInt(paramMap.get('ticketId') ?? '0');
      if (ticketId) {
        this.ticketId.set(ticketId);
      }
    });

    this.activatedRoute.queryParamMap.subscribe((queryParamMap) => {
      console.log('queryParamMap', queryParamMap);
    });

    effect(() => {
      const id = String(this.ticketId() ?? 123456);
      this.checkinForm.ticketId().value.set(id);
    });
    effect(() => {
      console.log('expertMode', this.expertMode());
    });
  }

  navigateToNextFlights(): void {
    this.router.navigate(['/next-flights'], {
      queryParams: {
        success: true,
      },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      fragment: 'result',
    });

    // Alternative
    // this.router.navigateByUrl('/flight-search');
  }

  checkin(): void {
    const { passenger, ...header } = this.checkinFormModel();

    const checkinForm: CheckinForm = {
      ...header,
      passenger: {
        ...initPassengerForm,
        ...passenger.value,
      },
    };

    console.log('checkinForm', checkinForm);

    this.dialog.open(CheckinDialogComponent, {
      width: '400px',
    });
  }
}

function custonBooleanAttribute(value: unknown): boolean {
  const valueAsString = String(value);
  return valueAsString === 'true' || valueAsString === '1';
}
