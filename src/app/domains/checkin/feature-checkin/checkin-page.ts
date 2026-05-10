import { JsonPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { CheckinChatService } from './checkin-chat-service';
import { CheckinDialogComponent } from './checkin-dialog';
import { CheckinTicketStore } from './checkin-ticket-store';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly checkinChat = inject(CheckinChatService);
  protected readonly ticketStore = inject(CheckinTicketStore);

  private readonly inputs = viewChildren<ElementRef>('input');

  protected readonly showNextFlights = signal(false);
  protected readonly documentPreviewUrl = signal<string | undefined>(undefined);
  protected readonly selectedDocumentName = signal('No document selected');

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

  protected readonly phoneNumber = new SignalFormControl(
    '1234 5678',
    (path) => {
      required(path);
    },
  );

  protected readonly passengerGroup = this.formBuilder.nonNullable.group({
    firstName: '',
    lastName: '',
    email: 'me@here.com',
    address: this.address,
    phoneNumber: this.phoneNumber,
    passport: this.formBuilder.nonNullable.group({
      passportNumber: '',
      issuedOn: '',
      validUntil: '',
      issuingAuthority: '',
    }),
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

  protected readonly extractedTicket = this.ticketStore.extractedTicket;

  protected readonly extractionStatusLine = computed(() => {
    const status = this.ticketStore.status();
    const isLoading = this.checkinChat.chat.isLoading();
    if (status === 'uploading') {
      return 'Preparing image...';
    }
    if (status === 'analyzing' || (status === 'idle' && isLoading)) {
      return 'Analyzing document...';
    }
    if (status === 'filled') {
      return 'Fields prefilled - please review.';
    }
    if (status === 'error') {
      return (
        this.ticketStore.errorMessage() ?? 'The ticket could not be analyzed.'
      );
    }
    return '';
  });

  protected readonly isAnalyzingDocument = computed(() => {
    const status = this.ticketStore.status();
    return (
      status === 'analyzing' ||
      (status === 'idle' && this.checkinChat.chat.isLoading())
    );
  });

  constructor() {
    this.initValidators();
    this.connectRouterParams();
    this.initForm();
    this.bindExtractedTicketToForm();

    const street = this.passengerGroup.controls.address.get('street');
    console.log('street', street);

    effect(() => {
      console.log('expertMode', this.expertMode());
    });

    // Replaces the previous "Erkannte Ticketdaten" summary card. The
    // form-prefill effect still runs in `bindExtractedTicketToForm()`; this
    // effect just gives developers a single line in the console showing the
    // raw ticket the agent extracted, which is useful for debugging without
    // taking any visual real estate.
    effect(() => {
      const ticket = this.extractedTicket();
      if (ticket) {
        console.log('[checkin] extracted ticket', ticket);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.revokeDocumentPreviewUrl();
    });
  }

  protected onTicketFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.selectedDocumentName.set(file.name);
    this.setDocumentPreview(file);
    void this.checkinChat.submitTicketImage(file);
    // Allow re-uploading the same file by clearing the native value.
    input.value = '';
  }

  protected openDocumentPicker(inputElement: HTMLInputElement): void {
    inputElement.click();
  }

  private setDocumentPreview(file: File): void {
    if (
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return;
    }
    this.revokeDocumentPreviewUrl();
    this.documentPreviewUrl.set(URL.createObjectURL(file));
  }

  private revokeDocumentPreviewUrl(): void {
    const currentPreviewUrl = this.documentPreviewUrl();
    if (!currentPreviewUrl || typeof URL === 'undefined') {
      return;
    }
    URL.revokeObjectURL(currentPreviewUrl);
    this.documentPreviewUrl.set(undefined);
  }

  private bindExtractedTicketToForm(): void {
    effect(() => {
      const ticket = this.extractedTicket();
      if (!ticket) {
        return;
      }

      if (typeof ticket.ticketId === 'string' && ticket.ticketId.length > 0) {
        this.checkinForm.ticketId().value.set(ticket.ticketId);
      }

      const passenger = ticket.passenger;
      if (passenger) {
        const patch: Partial<{
          firstName: string;
          lastName: string;
          email: string;
          passport: {
            passportNumber?: string;
            issuedOn?: string;
            validUntil?: string;
            issuingAuthority?: string;
          };
        }> = {};
        if (typeof passenger.firstName === 'string' && passenger.firstName) {
          patch.firstName = passenger.firstName;
        }
        if (typeof passenger.lastName === 'string' && passenger.lastName) {
          patch.lastName = passenger.lastName;
        }
        if (typeof passenger.email === 'string' && passenger.email) {
          patch.email = passenger.email;
        }
        const passportPatch: {
          passportNumber?: string;
          issuedOn?: string;
          validUntil?: string;
          issuingAuthority?: string;
        } = {};
        if (
          passenger.passport &&
          typeof passenger.passport.passportNumber === 'string' &&
          passenger.passport.passportNumber
        ) {
          passportPatch.passportNumber = passenger.passport.passportNumber;
        }
        if (
          passenger.passport &&
          typeof passenger.passport.issuedOn === 'string' &&
          passenger.passport.issuedOn
        ) {
          passportPatch.issuedOn = passenger.passport.issuedOn;
        }
        if (
          passenger.passport &&
          typeof passenger.passport.validUntil === 'string' &&
          passenger.passport.validUntil
        ) {
          passportPatch.validUntil = passenger.passport.validUntil;
        }
        if (
          passenger.passport &&
          typeof passenger.passport.issuingAuthority === 'string' &&
          passenger.passport.issuingAuthority
        ) {
          passportPatch.issuingAuthority = passenger.passport.issuingAuthority;
        }
        if (Object.keys(passportPatch).length > 0) {
          patch.passport = passportPatch;
        }
        if (Object.keys(patch).length > 0) {
          this.passengerGroup.patchValue(patch);
        }
      }
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
