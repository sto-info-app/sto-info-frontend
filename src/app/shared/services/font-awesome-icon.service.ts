import { Injectable, inject } from '@angular/core';
// @ts-ignore
import {
  faPlaystation,
  faSteam,
  faWindows,
  faXbox,
} from '@awesome.me/kit-5812c6b103/icons/classic/brands';

// @ts-ignore
import {
  faBadgeCheck,
  faCircleQuestion,
  faExternalLink,
  faHandSpock,
  faLock,
  faMars,
  faPlus,
  faSquareCheck,
  faSquareXmark,
  faTrash,
  faUser,
  faUserPen,
  // @ts-ignore
  faUserVisor,
  faVenus,
} from '@awesome.me/kit-5812c6b103/icons/classic/solid';
// @ts-ignore
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
      faUser,
      faUserPen,
      faUserVisor,
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
      faMars,
      faVenus,
    );
  }
}
