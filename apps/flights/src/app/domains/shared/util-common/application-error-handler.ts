import {
  EnvironmentProviders,
  ErrorHandler,
  inject,
  Injectable,
  makeEnvironmentProviders,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ApplicationlErrorHandler implements ErrorHandler {
  private snackBar = inject(MatSnackBar);

  handleError(error: unknown): void {
    const message = this.getMessage(error);

    // explizit Change Detection anstoßen
    this.snackBar.open(message, 'Schließen', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });

    console.error(error);
  }

  private getMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unexpected error';
  }
}

export function provideApplicationErrorHandler(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ErrorHandler, useClass: ApplicationlErrorHandler },
  ]);
}
