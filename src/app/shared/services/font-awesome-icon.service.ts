import { Injectable, inject } from '@angular/core';
import {
  faPlaystation,
  faWindows,
  faXbox,
} from '@awesome.me/kit-5812c6b103/icons/classic/brands';
import {
  faCircleQuestion,
  faExternalLink,
  faHandSpock,
  faLock,
  faPlus,
  faSquareCheck,
  faSquareXmark,
  faTrash,
  faUserPen,
} from '@awesome.me/kit-5812c6b103/icons/classic/solid';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';

@Injectable({ providedIn: 'root' })
export class FontAwesomeIconService {
  private readonly library = inject(FaIconLibrary);

  constructor() {
    this.library.addIcons(
      faHandSpock,
      faExternalLink,
      faPlus,
      faTrash,
      faUserPen,
      faLock,
      faSquareCheck,
      faSquareXmark,
      faCircleQuestion,
      faWindows,
      faXbox,
      faPlaystation,
    );
  }
}
