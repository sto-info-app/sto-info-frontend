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

      // The signed-in person's own applications and invitations (FC-021).
      // A literal, like `register` below, so never a Community slug.
      {
        path: 'applications',
        loadComponent: () =>
          import('./recruitment/my-fleet-applications/my-fleet-applications.component').then(
            m => m.MyFleetApplicationsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_MY_APPLICATIONS },
        canActivate: [AuthGuard],
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
      // A Fleet's holdings (FC-023): public, so signed out as well. Whether
      // the reader may record them is the server's answer.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/holdings',
        loadComponent: () =>
          import('./holdings/fleet-holdings/fleet-holdings.component').then(
            m => m.FleetHoldingsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_HOLDINGS },
      },
      // A Fleet's activity (FC-029), for whoever may see each item.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/activity',
        loadComponent: () =>
          import('./activity/fleet-activity-page/fleet-activity-page.component').then(
            m => m.FleetActivityPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ACTIVITY },
      },
      // A Fleet’s events (FC-030): the calendar, each event and each occurrence
      // for whoever it is shown to, signed in or not; the editor for its
      // event managers. `new` is a literal no event's ID can be, and comes
      // before the event it would otherwise be read as.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/events',
        loadComponent: () =>
          import('./events/fleet-event-calendar/fleet-event-calendar.component').then(
            m => m.FleetEventCalendarComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENTS },
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/events/new',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_NEW },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/events/:eventId',
        loadComponent: () =>
          import('./events/fleet-event-detail/fleet-event-detail.component').then(
            m => m.FleetEventDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT },
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/events/:eventId/edit',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_EDIT },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/events/:eventId/occurrences/:occurrenceId',
        loadComponent: () =>
          import('./events/fleet-event-occurrence/fleet-event-occurrence.component').then(
            m => m.FleetEventOccurrenceComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_OCCURRENCE },
      },
      // A Fleet's news (FC-027). Reading is for whoever each post is
      // published to, signed in or not, which is the server's answer;
      // writing is for its news writers. `write` is a literal no post's
      // address can be, and comes before the post it would otherwise be read
      // as.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/news',
        loadComponent: () =>
          import('./news/fleet-news-list/fleet-news-list.component').then(
            m => m.FleetNewsListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS },
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/news/write',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_WRITE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/news/:postSlug',
        loadComponent: () =>
          import('./news/fleet-news-post/fleet-news-post.component').then(
            m => m.FleetNewsPostComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_POST },
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/news/:postSlug/edit',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_EDIT },
        canActivate: [AuthGuard],
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
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/investigate/conflicts',
        loadComponent: () =>
          import('./investigate/roster-conflicts/roster-conflicts.component').then(
            m => m.RosterConflictsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ROSTER_CONFLICTS },
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
      // Applying to a Fleet, and where its officers run its recruitment
      // (FC-021). Signed in, because each is somebody acting on a Fleet;
      // whether they may is the server's answer, and each page asks it. The
      // pages below Recruitment sit under its address so its tab stays lit.
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/apply',
        loadComponent: () =>
          import('./recruitment/fleet-apply/fleet-apply.component').then(
            m => m.FleetApplyComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_APPLY },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment',
        loadComponent: () =>
          import('./recruitment/fleet-recruitment-hub/fleet-recruitment-hub.component').then(
            m => m.FleetRecruitmentHubComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_RECRUITMENT },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment/applications',
        loadComponent: () =>
          import('./recruitment/fleet-applications/fleet-applications.component').then(
            m => m.FleetApplicationsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_APPLICATIONS },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment/applications/:applicationId',
        loadComponent: () =>
          import('./recruitment/fleet-application-detail/fleet-application-detail.component').then(
            m => m.FleetApplicationDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_APPLICATION },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment/invitations',
        loadComponent: () =>
          import('./recruitment/fleet-invitations/fleet-invitations.component').then(
            m => m.FleetInvitationsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_INVITATIONS },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment/members',
        loadComponent: () =>
          import('./recruitment/fleet-members/fleet-members.component').then(
            m => m.FleetMembersComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_MEMBERS },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/recruitment/settings',
        loadComponent: () =>
          import('./recruitment/fleet-recruitment-settings/fleet-recruitment-settings.component').then(
            m => m.FleetRecruitmentSettingsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_RECRUITMENT_SETTINGS },
        canActivate: [AuthGuard],
      },

      // Who governs a Community or Fleet (FC-022). The same pages answer at
      // both levels; the address says which. Ownership and its disputes are
      // the Community's alone.
      {
        path: 'communities/:communitySlug/manage',
        loadComponent: () =>
          import('./governance/governance-hub/governance-hub.component').then(
            m => m.GovernanceHubComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_MANAGE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/manage/roles',
        loadComponent: () =>
          import('./governance/governance-roles/governance-roles.component').then(
            m => m.GovernanceRolesComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_ROLES },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/manage/delegation',
        loadComponent: () =>
          import('./governance/governance-delegation/governance-delegation.component').then(
            m => m.GovernanceDelegationComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_DELEGATION },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/manage/history',
        loadComponent: () =>
          import('./governance/governance-history/governance-history.component').then(
            m => m.GovernanceHistoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_HISTORY },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/manage/ownership',
        loadComponent: () =>
          import('./governance/community-ownership/community-ownership.component').then(
            m => m.CommunityOwnershipComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_COMMUNITY_OWNERSHIP },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/manage/dispute',
        loadComponent: () =>
          import('./governance/community-dispute/community-dispute.component').then(
            m => m.CommunityDisputeComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_COMMUNITY_DISPUTE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/manage',
        loadComponent: () =>
          import('./governance/governance-hub/governance-hub.component').then(
            m => m.GovernanceHubComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_MANAGE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/manage/roles',
        loadComponent: () =>
          import('./governance/governance-roles/governance-roles.component').then(
            m => m.GovernanceRolesComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_ROLES },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/manage/delegation',
        loadComponent: () =>
          import('./governance/governance-delegation/governance-delegation.component').then(
            m => m.GovernanceDelegationComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_DELEGATION },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/fleets/:platformSegment/:slug/manage/history',
        loadComponent: () =>
          import('./governance/governance-history/governance-history.component').then(
            m => m.GovernanceHistoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_HISTORY },
        canActivate: [AuthGuard],
      },

      // An Armada's sections (FC-026). Its history is for whoever may see it;
      // its requests are its managers', which the server decides. Its Manage
      // pages are the Fleet's, told by the route that the scope is an
      // Armada.
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/history',
        loadComponent: () =>
          import('./armadas/armada-history/armada-history.component').then(
            m => m.ArmadaHistoryComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ARMADA_HISTORY },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/requests',
        loadComponent: () =>
          import('./armadas/armada-requests/armada-requests.component').then(
            m => m.ArmadaRequestsComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ARMADA_REQUESTS },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/manage',
        loadComponent: () =>
          import('./governance/governance-hub/governance-hub.component').then(
            m => m.GovernanceHubComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_MANAGE, governs: 'ARMADA' },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/manage/roles',
        loadComponent: () =>
          import('./governance/governance-roles/governance-roles.component').then(
            m => m.GovernanceRolesComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_ROLES,
          governs: 'ARMADA',
        },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/manage/delegation',
        loadComponent: () =>
          import('./governance/governance-delegation/governance-delegation.component').then(
            m => m.GovernanceDelegationComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_DELEGATION,
          governs: 'ARMADA',
        },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/manage/history',
        loadComponent: () =>
          import('./governance/governance-history/governance-history.component').then(
            m => m.GovernanceHistoryComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.FLEET_GOVERNANCE_HISTORY,
          governs: 'ARMADA',
        },
        canActivate: [AuthGuard],
      },

      // An Armada's activity (FC-029), told by the route it is an Armada's.
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/activity',
        loadComponent: () =>
          import('./activity/fleet-activity-page/fleet-activity-page.component').then(
            m => m.FleetActivityPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ACTIVITY, governs: 'ARMADA' },
      },
      // An Armada’s events (FC-030): the calendar, each event and each occurrence
      // for whoever it is shown to, signed in or not; the editor for its
      // event managers. `new` is a literal no event's ID can be, and comes
      // before the event it would otherwise be read as.
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/events',
        loadComponent: () =>
          import('./events/fleet-event-calendar/fleet-event-calendar.component').then(
            m => m.FleetEventCalendarComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENTS, governs: 'ARMADA' },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/events/new',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_NEW, governs: 'ARMADA' },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/events/:eventId',
        loadComponent: () =>
          import('./events/fleet-event-detail/fleet-event-detail.component').then(
            m => m.FleetEventDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT, governs: 'ARMADA' },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/events/:eventId/edit',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_EDIT, governs: 'ARMADA' },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/events/:eventId/occurrences/:occurrenceId',
        loadComponent: () =>
          import('./events/fleet-event-occurrence/fleet-event-occurrence.component').then(
            m => m.FleetEventOccurrenceComponent,
          ),
        data: {
          title: APP_ROUTE_TITLES.FLEET_EVENT_OCCURRENCE,
          governs: 'ARMADA',
        },
      },
      // An Armada's news (FC-027), as a Fleet's. Resolved as the Armada's
      // Manage pages are, told so by the route.
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/news',
        loadComponent: () =>
          import('./news/fleet-news-list/fleet-news-list.component').then(
            m => m.FleetNewsListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS, governs: 'ARMADA' },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/news/write',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_WRITE, governs: 'ARMADA' },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/news/:postSlug',
        loadComponent: () =>
          import('./news/fleet-news-post/fleet-news-post.component').then(
            m => m.FleetNewsPostComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_POST, governs: 'ARMADA' },
      },
      {
        path: 'communities/:communitySlug/armadas/:platformSegment/:slug/news/:postSlug/edit',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_EDIT, governs: 'ARMADA' },
        canActivate: [AuthGuard],
      },
      // A Community's own activity (FC-029).
      {
        path: 'communities/:communitySlug/activity',
        loadComponent: () =>
          import('./activity/fleet-activity-page/fleet-activity-page.component').then(
            m => m.FleetActivityPageComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_ACTIVITY },
      },
      // A Community’s own events (FC-030): the calendar, each event and each occurrence
      // for whoever it is shown to, signed in or not; the editor for its
      // event managers. `new` is a literal no event's ID can be, and comes
      // before the event it would otherwise be read as.
      {
        path: 'communities/:communitySlug/events',
        loadComponent: () =>
          import('./events/fleet-event-calendar/fleet-event-calendar.component').then(
            m => m.FleetEventCalendarComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENTS },
      },
      {
        path: 'communities/:communitySlug/events/new',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_NEW },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/events/:eventId',
        loadComponent: () =>
          import('./events/fleet-event-detail/fleet-event-detail.component').then(
            m => m.FleetEventDetailComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT },
      },
      {
        path: 'communities/:communitySlug/events/:eventId/edit',
        loadComponent: () =>
          import('./events/fleet-event-editor/fleet-event-editor.component').then(
            m => m.FleetEventEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_EDIT },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/events/:eventId/occurrences/:occurrenceId',
        loadComponent: () =>
          import('./events/fleet-event-occurrence/fleet-event-occurrence.component').then(
            m => m.FleetEventOccurrenceComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_EVENT_OCCURRENCE },
      },
      // A Community's own news (FC-027), as a Fleet's. Its address has no
      // platform, which is how the pages know it is the Community's.
      {
        path: 'communities/:communitySlug/news',
        loadComponent: () =>
          import('./news/fleet-news-list/fleet-news-list.component').then(
            m => m.FleetNewsListComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS },
      },
      {
        path: 'communities/:communitySlug/news/write',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_WRITE },
        canActivate: [AuthGuard],
      },
      {
        path: 'communities/:communitySlug/news/:postSlug',
        loadComponent: () =>
          import('./news/fleet-news-post/fleet-news-post.component').then(
            m => m.FleetNewsPostComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_POST },
      },
      {
        path: 'communities/:communitySlug/news/:postSlug/edit',
        loadComponent: () =>
          import('./news/fleet-news-editor/fleet-news-editor.component').then(
            m => m.FleetNewsEditorComponent,
          ),
        data: { title: APP_ROUTE_TITLES.FLEET_NEWS_EDIT },
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
