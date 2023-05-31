import { animate, transition, trigger } from '@angular/animations';

export const progressBarAnimation = trigger('progressBarAnimation', [
  transition('idle <=> submitting', animate('400ms ease-in-out')),
]);
