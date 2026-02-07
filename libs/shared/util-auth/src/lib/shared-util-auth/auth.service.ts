import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly userName = signal('');

  // Login for honest users TM
  login(userName: string): void {
    this.userName.set(userName);
  }

  logout(): void {
    this.userName.set('');
  }
}
