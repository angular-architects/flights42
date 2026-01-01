import { inject, ElementRef } from '@angular/core';

// Dirty Hack used to visualize the change detector
export function injectBlink() {
  const element = inject(ElementRef);

  return () => {
    element.nativeElement.firstChild.style.backgroundColor = 'crimson';

    setTimeout(() => {
      element.nativeElement.firstChild.style.backgroundColor = 'white';
    }, 1000);

    return null;
  };
}
