import { Injectable, inject } from '@angular/core';
import {
  faPlaystation,
  faSteam,
  faWindows,
  faXbox,
} from '@awesome.me/kit-5812c6b103/icons/classic/brands';

import {
  faBadgeCheck,
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
import {
  faArcGames,
  faEpicGames,
} from '@awesome.me/kit-5812c6b103/icons/kit/custom';

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
      faArcGames,
      faEpicGames,
      faSteam,
      faBadgeCheck,
    );
  }
}
