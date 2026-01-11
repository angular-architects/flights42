import { Component, inject } from '@angular/core';

import { UserService } from './user-service';

@Component({
  selector: 'lib-user-panel',
  imports: [],
  template: `<p class="mb-30">
    <b>Current User:</b> {{ userService.userName() }}
  </p> `,
})
export class UserPanel {
  userService = inject(UserService);
}
