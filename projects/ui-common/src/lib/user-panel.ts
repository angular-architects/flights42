import { Component, inject } from '@angular/core';

import { UserService } from './user-service';

@Component({
  selector: 'lib-user-panel',
  imports: [],
  template: `<p><b>Current User:</b> {{ userService.userName() }}</p> `,
})
export class UserPanel {
  userService = inject(UserService);
}
