import { Routes } from '@angular/router';

import { AuthGuard } from 'src/app/core/auth/auth.guard';
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

      // A literal, and therefore never a Community slug: a scope's address
      // always names its collection first, so `register` and `communities`
      // cannot be confused for one another.
      {
        path: 'register',
        loadComponent: () =>
          import('./register/community-register/community-register.component').then(
            m => m.CommunityRegisterComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_REGISTER },
        canActivate: [AuthGuard],
      },

      {
        path: 'register-standalone',
        loadComponent: () =>
          import('./register/standalone-register/standalone-register.component').then(
            m => m.StandaloneRegisterComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_REGISTER_STANDALONE },
        canActivate: [AuthGuard],
      },

      // Registering into a Community sits inside the collection it adds to,
      // and `register` is a literal where the deeper routes have a platform
      // segment — four segments against five, so neither can claim the
      // other's address.
      {
        path: 'communities/:communitySlug/fleets/register',
        loadComponent: () =>
          import('./register/fleet-register/fleet-register.component').then(
            m => m.FleetRegisterComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_REGISTER_FLEET },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/register',
        loadComponent: () =>
          import('./register/armada-register/armada-register.component').then(
            m => m.ArmadaRegisterComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_REGISTER_ARMADA },
        canActivate: [AuthGuard],
      },

      // The two deeper addresses come before the Community's own, so
      // `communities/x/fleets/pc/y` is never read as a Community called `x`
      // with three segments of nonsense after it.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug',
        loadComponent: () =>
          import('./scope/fleet-page/fleet-page.component').then(
            m => m.FleetPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_SCOPE_FLEET },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug',
        loadComponent: () =>
          import('./scope/armada-page/armada-page.component').then(
            m => m.ArmadaPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_SCOPE_ARMADA },
      },
      {
        path: 'communities/:communitySlug',
        loadComponent: () =>
          import('./scope/community-page/community-page.component').then(
            m => m.CommunityPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_COMMUNITY },
      },
    ],
  },
];
