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

      // Deeper than a Fleet's own page and therefore ahead of it, by the
      // same rule that puts a Fleet ahead of a Community: the longer address
      // is matched first so the shorter one never swallows its tail.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/import',
        loadComponent: () =>
          import('./imports/roster-import/roster-import.component').then(
            m => m.RosterImportComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_IMPORT },
        // Signed in, because importing an export is a thing somebody does to
        // a Fleet they run. Whether they may is the server's answer, and the
        // page asks it rather than guarding on a guess.
        canActivate: [AuthGuard],
      },
      // Where the page lived while it could only check, kept so a link to
      // it still arrives somewhere.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/check-export',
        redirectTo:
          'communities/:communitySlug/fleets/:platformSegment/:slug/import',
        pathMatch: 'full',
      },
      // A Fleet's roster, for its members (FC-020). Signed in, because it is
      // the private roster; whether the reader is a member is the server's
      // answer, and the page asks it.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/roster',
        loadComponent: () =>
          import('./roster/roster-page/roster-page.component').then(
            m => m.RosterPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/history',
        loadComponent: () =>
          import('./roster/roster-history/roster-history.component').then(
            m => m.RosterHistoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_HISTORY },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/history/members/:identityId',
        loadComponent: () =>
          import('./roster/roster-timeline/roster-timeline.component').then(
            m => m.RosterTimelineComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_MEMBER },
        canActivate: [AuthGuard],
      },
      // A Fleet's reports (FC-020). Not behind the sign-in guard: an Owner
      // can show a report's counts to anyone, and which reports a reader
      // sees is the server's answer.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/reports',
        loadComponent: () =>
          import('./fleet-reports/fleet-reports-page/fleet-reports-page.component').then(
            m => m.FleetReportsPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_REPORTS },
      },
      // Where a Fleet's roster is looked into (FC-020). The pages below it
      // sit under its address so its tab stays lit while a reader works
      // through them.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate',
        loadComponent: () =>
          import('./investigate/fleet-investigate/fleet-investigate.component').then(
            m => m.FleetInvestigateComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_INVESTIGATE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/imports',
        loadComponent: () =>
          import('./imports/roster-import-list/roster-import-list.component').then(
            m => m.RosterImportListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_IMPORTS },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/imports/:importId',
        loadComponent: () =>
          import('./imports/roster-import-status/roster-import-status.component').then(
            m => m.RosterImportStatusComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_IMPORT_DETAIL },
        // Signed in for the same reason: an import is read by somebody who
        // runs the Fleet, and which of them may is the server's answer.
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/identities',
        loadComponent: () =>
          import('./identities/roster-identity-list/roster-identity-list.component').then(
            m => m.RosterIdentityListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_IDENTITIES },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/rank-order',
        loadComponent: () =>
          import('./investigate/rank-order/rank-order.component').then(
            m => m.RankOrderComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_RANK_ORDER },
        canActivate: [AuthGuard],
      },
      // Where those pages lived before they moved under Investigate, kept so
      // a link to one still arrives.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/imports',
        redirectTo:
          'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/imports',
        pathMatch: 'full',
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/imports/:importId',
        redirectTo:
          'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/imports/:importId',
        pathMatch: 'full',
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/identities',
        redirectTo:
          'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/identities',
        pathMatch: 'full',
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
