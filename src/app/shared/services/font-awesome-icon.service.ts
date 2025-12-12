import { Injectable, inject } from '@angular/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faExternalLink,
  faHandSpock,
  faLock,
  faSquareCheck,
  faSquareXmark,
  faUserPen,
} from '@fortawesome/free-solid-svg-icons';

// NOTE: This imports all icons into the bundle and increases app size!
// import { fas } from '@fortawesome/pro-solid-svg-icons';
// import { far } from '@fortawesome/pro-regular-svg-icons';

@Injectable({ providedIn: 'root' })
export class FontAwesomeIconService {
  private readonly library = inject(FaIconLibrary);

  constructor() {
    this.library.addIcons(
      faHandSpock,
      faExternalLink,
      faUserPen,
      faLock,
      faSquareCheck,
      faSquareXmark,
    );
  }
}
