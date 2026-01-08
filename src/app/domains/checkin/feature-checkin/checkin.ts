import { JsonPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Field, required } from '@angular/forms/signals';
import { compatForm } from '@angular/forms/signals/compat';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { NextFlightsModule } from '../../ticketing/api';
import { CheckinForm } from '../data/checkin-form';
import { initPassengerForm, PassengerForm } from '../data/passenger-form';
import { CheckinDialogComponent } from './checkin-dialog';

@Component({
  selector: 'app-checkin',
  imports: [
    Field,
    ReactiveFormsModule,
    RouterLink,
    JsonPipe,
    NextFlightsModule,
  ],
  templateUrl: './checkin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkin {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private formBuilder = inject(FormBuilder);

  protected readonly inputs = viewChildren<ElementRef>('input');

  protected readonly showNextFlights = signal(false);

  protected readonly passengerGroup =
    this.formBuilder.nonNullable.group<PassengerForm>({
      firstName: '',
      lastName: '',
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
    transform: customBooleanAttribute,
  });

  protected readonly ticketId = signal<number | undefined>(undefined);

  constructor() {
    this.initValidators();
    this.connectRouterParams();
    this.initForm();

    effect(() => {
      console.log('expertMode', this.expertMode());
    });
  }

  private initForm() {
    effect(() => {
      const id = String(this.ticketId() ?? 123456);
      this.checkinForm.ticketId().value.set(id);
    });

    // Hint: effect would run too early
    afterNextRender(() => {
      this.focusFirstEmptyElement();
    });
  }

  private connectRouterParams() {
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
  }

  private initValidators() {
    this.passengerGroup.controls.email.addValidators([
      Validators.required,
      Validators.minLength(3),
      Validators.email,
    ]);
  }

  private focusFirstEmptyElement() {
    for (const element of this.inputs()) {
      if (!element.nativeElement.value) {
        element.nativeElement.focus();
        break;
      }
    }
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

  toggleNextFlights(): void {
    this.showNextFlights.update((show) => !show);
  }
}

function customBooleanAttribute(value: unknown): boolean {
  const valueAsString = String(value);
  return valueAsString === 'true' || valueAsString === '1';
}
