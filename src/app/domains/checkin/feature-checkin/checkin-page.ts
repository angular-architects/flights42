import { JsonPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, required } from '@angular/forms/signals';
import { SignalFormControl } from '@angular/forms/signals/compat';
import { compatForm } from '@angular/forms/signals/compat';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

// import { NextFlightsModule } from '../../ticketing/api';
import { CheckinDialogComponent } from './checkin-dialog';

@Component({
  selector: 'app-checkin-page',
  imports: [
    FormField,
    ReactiveFormsModule,
    RouterLink,
    JsonPipe,
    // NextFlightsModule,
  ],
  templateUrl: './checkin-page.html',
  styleUrl: './checkin-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckinPage {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly formBuilder = inject(FormBuilder);

  private readonly inputs = viewChildren<ElementRef>('input');

  protected readonly showNextFlights = signal(false);

  protected readonly fullPhoneNumber = computed(
    () => '+43 ' + this.phoneNumber.sourceValue(),
  );

  protected readonly addressFormModel = signal({
    street: '',
    zipCode: '',
    city: '',
    country: '',
  });

  protected readonly address = new SignalFormControl(
    this.addressFormModel(),
    (path) => {
      required(path.street);
      required(path.zipCode);
      required(path.country);
    },
  );

  protected readonly phoneNumber = new SignalFormControl('', (path) => {
    required(path);
  });

  protected readonly passengerGroup = this.formBuilder.nonNullable.group({
    firstName: '',
    lastName: '',
    email: 'me@here.com',
    address: this.address,
    phoneNumber: this.phoneNumber,
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

  private readonly ticketId = signal<number | undefined>(undefined);

  constructor() {
    this.initValidators();
    this.connectRouterParams();
    this.initForm();

    const street = this.passengerGroup.controls.address.get('street');
    console.log('street', street);

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

    this.activatedRoute.fragment.subscribe((fragment) => {
      console.log('fragment', fragment);
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

  protected navigateToNextFlights(): void {
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

  protected checkin(): void {
    const { passenger, ...header } = this.checkinFormModel();

    const checkinInfo = {
      ...header,
      passenger: {
        ...passenger.value,
      },
    };

    console.log('checkinInfo', checkinInfo);

    this.dialog.open(CheckinDialogComponent, {
      width: '400px',
    });
  }

  protected toggleNextFlights(): void {
    this.showNextFlights.update((show) => !show);
  }
}

function customBooleanAttribute(value: unknown): boolean {
  const valueAsString = String(value);
  return valueAsString === 'true' || valueAsString === '1';
}
