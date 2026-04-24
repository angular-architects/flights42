import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ticket-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 140 28"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flight42 logo">
      <g fill="currentColor">
        <path
          d="M6 14 L20 4 L22 6 L14 14 L22 22 L20 24 Z"
          transform="translate(0 0)" />
        <text
          x="30"
          y="19"
          font-family="'Inter', 'Segoe UI', sans-serif"
          font-size="16"
          font-weight="800"
          letter-spacing="0.5">
          Flight42
        </text>
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      color: var(--ticket-accent, #1c2640);
    }
    svg {
      display: block;
      width: 7rem;
      height: 1.6rem;
    }
  `,
})
export class TicketLogo {}
