import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isLoggedIn = signal(true);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  private readonly _authToken = signal('ABCDEFG123456');
  readonly authToken = this._authToken.asReadonly();
}
