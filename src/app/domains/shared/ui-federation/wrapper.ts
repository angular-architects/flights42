import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

export interface WrapperConfig {
  remoteName: string;
  exposedModule: string;
  elementName: string;
}

export const initWrapperConfig: WrapperConfig = {
  remoteName: '',
  exposedModule: '',
  elementName: '',
};

@Component({
  selector: 'app-wrapper',
  imports: [CommonModule],
  templateUrl: './wrapper.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./wrapper.css'],
})
export class Wrapper {
  private elm = inject(ElementRef);

  // The router now assignes routing parameters
  // (query string, matrix paraters, the passed data object)
  // to inputs. To make this work, the function
  //       withComponentInputBinding()
  // needs to be added when bootstrapping the application
  // (see bootstrap.ts)
  config = input(initWrapperConfig);

  constructor() {
    effect(async () => {
      const { exposedModule, remoteName, elementName } = this.config();

      await loadRemoteModule(remoteName, exposedModule);
      const root = document.createElement(elementName);
      this.elm.nativeElement.appendChild(root);
    });
  }
}
