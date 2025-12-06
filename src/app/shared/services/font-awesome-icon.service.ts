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
