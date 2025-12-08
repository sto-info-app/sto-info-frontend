import { Injectable } from '@angular/core';
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
  constructor(private readonly library: FaIconLibrary) {
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
