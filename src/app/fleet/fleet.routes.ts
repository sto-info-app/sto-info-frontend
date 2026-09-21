import { Routes } from '@angular/router';

import { APP_ROUTE_TITLES } from 'src/app/shared/constants/app-routing.constants';

import { FleetHomeComponent } from './fleet-home/fleet-home.component';

/**
 * The Fleet directory's routes, loaded on demand.
 *
 * The three listings are routes below one parent rather than tabs inside one
 * component, so each is bookmarkable, shareable and reachable with the back
 * button, and so the question "is this feature switched on" is asked once
 * rather than three times.
 *
 * The parent is not lazy. It is the component that answers that question, and
 * a reader who followed a link to a switched-off feature should be told so
 * rather than made to wait for a chunk that will then say nothing.
 *
 * `communities` and `armadas` are literal siblings of the Fleet listing, and
 * a Community sits one segment below the first of them — which is what keeps
 * a Community slug from ever being mistaken for a page of the directory's
 * own, however the directory grows.
 */
export const FLEET_ROUTES: Routes = [
  {
    path: '',
    component: FleetHomeComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./directory/fleets-directory/fleets-directory.component').then(
            m => m.FleetsDirectoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEETS },
      },
      {
        path: 'communities',
        loadComponent: () =>
          import('./directory/communities-directory/communities-directory.component').then(
            m => m.CommunitiesDirectoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_COMMUNITIES },
      },
      {
        path: 'armadas',
        loadComponent: () =>
          import('./directory/armadas-directory/armadas-directory.component').then(
            m => m.ArmadasDirectoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ARMADAS },
      },
    ],
  },
];
