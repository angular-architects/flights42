import { Service, signal } from '@angular/core';

@Service()
export class UserService {
  readonly userName = signal('Jane Doe');
}
