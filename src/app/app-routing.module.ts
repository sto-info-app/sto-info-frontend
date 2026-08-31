import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './core/auth/admin.guard';
import { AuthGuard } from './core/auth/auth.guard';
import { ChangePasswordComponent } from './core/auth/change-password/change-password.component';
import { ResetPasswordRequestComponent } from './core/auth/reset-password-request/reset-password-request.component';
import { ApiRequiredGuard } from './core/health/api-required.guard';
import { LoginComponent } from './core/login/login.component';
import { RegisterComponent } from './core/register/register.component';
import { RegistrationCompleteComponent } from './core/registration-complete/registration-complete.component';
import { VerifyEmailComponent } from './core/verify-email/verify-email.component';
import { AccountsComponent } from './dashboard/accounts/accounts.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './dashboard/profile/profile.component';
import { PageNotFoundComponent } from './error-pages/page-not-found/page-not-found.component';
import { ServiceInterruptionComponent } from './error-pages/service-interruption/service-interruption.component';
import { HomeComponent } from './home/home.component';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from './shared/constants/app-routing.constants';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { CreditsComponent } from './static-pages/credits/credits.component';
import { PrivacyPolicyComponent } from './static-pages/privacy-policy/privacy-policy.component';
import { ResourcesComponent } from './static-pages/resources/resources.component';
import { RoadmapComponent } from './static-pages/roadmap/roadmap.component';
import { TeamDevelopersComponent } from './static-pages/team/developers/developers.component';
import { TeamSupportersComponent } from './static-pages/team/supporters/supporters.component';
import { TeamMemberComponent } from './static-pages/team/team-member/team-member.component';
import { TeamVolunteersComponent } from './static-pages/team/volunteers/volunteers.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';

export const routes: Routes = [
  // *****************************************
  // * Default route
  {
    path: '',
    component: HomeComponent,
    data: { title: APP_ROUTE_TITLES.HOME },
  },

  // *****************************************
  // * User auth, registration and validation
  {
    path: APP_ROUTES.LOGIN,
    component: LoginComponent,
    data: { title: APP_ROUTE_TITLES.LOGIN, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.REGISTER,
    component: RegisterComponent,
    data: { title: APP_ROUTE_TITLES.REGISTER, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.REGISTER_COMPLETE,
    component: RegistrationCompleteComponent,
    data: { title: APP_ROUTE_TITLES.REGISTER_COMPLETE, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.VERIFY_EMAIL,
    component: VerifyEmailComponent,
    data: { title: APP_ROUTE_TITLES.VERIFY_EMAIL, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.RESET_PASSWORD,
    component: ResetPasswordRequestComponent,
    data: { title: APP_ROUTE_TITLES.RESET_PASSWORD, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.CHANGE_PASSWORD,
    component: ChangePasswordComponent,
    data: { title: APP_ROUTE_TITLES.CHANGE_PASSWORD, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },

  // *****************************************
  // * Static pages
  {
    path: APP_ROUTES.ABOUT,
    component: AboutComponent,
    data: { title: APP_ROUTE_TITLES.ABOUT },
  },
  {
    path: APP_ROUTES.ROADMAP,
    component: RoadmapComponent,
    data: { title: APP_ROUTE_TITLES.ROADMAP },
  },
  {
    path: APP_ROUTES.RESOURCES,
    component: ResourcesComponent,
    data: { title: APP_ROUTE_TITLES.RESOURCES },
  },
  {
    path: APP_ROUTES.HELP,
    loadComponent: () =>
      import('./static-pages/help/help.component').then(m => m.HelpComponent),
    data: { title: APP_ROUTE_TITLES.HELP },
  },
  {
    path: APP_ROUTES.HELP_GUIDE,
    loadComponent: () =>
      import('./static-pages/help/help-guide/help-guide.component').then(
        m => m.HelpGuideComponent,
      ),
    data: { title: APP_ROUTE_TITLES.HELP_GUIDE },
  },
  {
    path: APP_ROUTES.ABOUT_DEVELOPERS,
    component: TeamDevelopersComponent,
    data: { title: APP_ROUTE_TITLES.ABOUT_DEVELOPERS },
  },
  {
    path: APP_ROUTES.ABOUT_DEVELOPER_DETAIL,
    component: TeamMemberComponent,
    data: {
      title: APP_ROUTE_TITLES.ABOUT_DEVELOPER_DETAIL,
      teamGroup: 'developers',
    },
  },
  {
    path: APP_ROUTES.ABOUT_VOLUNTEERS,
    component: TeamVolunteersComponent,
    data: { title: APP_ROUTE_TITLES.ABOUT_VOLUNTEERS },
  },
  {
    path: APP_ROUTES.ABOUT_VOLUNTEER_DETAIL,
    component: TeamMemberComponent,
    data: {
      title: APP_ROUTE_TITLES.ABOUT_VOLUNTEER_DETAIL,
      teamGroup: 'volunteers',
    },
  },
  {
    path: APP_ROUTES.ABOUT_SUPPORTERS,
    component: TeamSupportersComponent,
    data: { title: APP_ROUTE_TITLES.ABOUT_SUPPORTERS },
  },
  {
    path: APP_ROUTES.CONTACT,
    component: ContactComponent,
    data: { title: APP_ROUTE_TITLES.CONTACT },
  },
  {
    path: APP_ROUTES.TERMS_OF_USE,
    component: TermsOfUseComponent,
    data: { title: APP_ROUTE_TITLES.TERMS_OF_USE },
  },
  {
    path: APP_ROUTES.CREDITS,
    component: CreditsComponent,
    data: { title: APP_ROUTE_TITLES.CREDITS },
  },
  {
    path: APP_ROUTES.PRIVACY_POLICY,
    component: PrivacyPolicyComponent,
    data: { title: APP_ROUTE_TITLES.PRIVACY_POLICY },
  },

  // *****************************************
  // * Community - Galactic Personnel Registry (public)
  {
    path: APP_ROUTES.COMMUNITY,
    loadComponent: () =>
      import('./community/community.component').then(m => m.CommunityComponent),
    data: { title: APP_ROUTE_TITLES.COMMUNITY },
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY,
    redirectTo: APP_ROUTES.COMMUNITY_REGISTRY_PROFILES,
    pathMatch: 'full',
  },
  {
    path: APP_ROUTES.COMMUNITY_FRIENDS,
    loadComponent: () =>
      import('./community/friends/friends-page/friends-page.component').then(
        m => m.FriendsPageComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_FRIENDS,
      requiresApi: true,
    },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_SEARCH,
    loadComponent: () =>
      import('./community/registry/registry-list/registry-list.component').then(
        m => m.RegistryListComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_SEARCH,
      mode: 'search',
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_RECENTLY_JOINED,
    loadComponent: () =>
      import('./community/registry/registry-list/registry-list.component').then(
        m => m.RegistryListComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_RECENTLY_JOINED,
      mode: 'recently-joined',
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_RECENTLY_ACTIVE,
    loadComponent: () =>
      import('./community/registry/registry-list/registry-list.component').then(
        m => m.RegistryListComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_RECENTLY_ACTIVE,
      mode: 'recently-active',
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_PROFILES,
    loadComponent: () =>
      import('./community/registry/registry-list/registry-list.component').then(
        m => m.RegistryListComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_PROFILES,
      mode: 'all',
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_PROFILE,
    loadComponent: () =>
      import('./community/registry/registry-profile/registry-profile.component').then(
        m => m.RegistryProfileComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_PROFILE,
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_ACCOUNT,
    loadComponent: () =>
      import('./community/registry/registry-account/registry-account.component').then(
        m => m.RegistryAccountComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_ACCOUNT,
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.COMMUNITY_REGISTRY_CHARACTER,
    loadComponent: () =>
      import('./community/registry/registry-character/registry-character.component').then(
        m => m.RegistryCharacterComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.COMMUNITY_REGISTRY_CHARACTER,
      requiresApi: true,
    },
    canActivate: [ApiRequiredGuard],
  },

  // *****************************************
  // * News
  {
    path: APP_ROUTES.NEWS,
    loadComponent: () =>
      import('./news/news-list/news-list.component').then(
        m => m.NewsListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.NEWS, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.NEWS_DETAIL,
    loadComponent: () =>
      import('./news/news-detail/news-detail.component').then(
        m => m.NewsDetailComponent,
      ),
    data: { title: APP_ROUTE_TITLES.NEWS_DETAIL, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },

  // *****************************************
  // * Notifications (authenticated)
  {
    path: APP_ROUTES.NOTIFICATIONS,
    loadComponent: () =>
      import('./notifications/notifications-page/notifications-page.component').then(
        m => m.NotificationsPageComponent,
      ),
    data: { title: APP_ROUTE_TITLES.NOTIFICATIONS, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },

  // *****************************************
  // * Admin (admin role required)
  {
    path: APP_ROUTES.ADMIN,
    loadComponent: () =>
      import('./admin/admin.component').then(m => m.AdminComponent),
    data: { title: APP_ROUTE_TITLES.ADMIN, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_NEWS,
    loadComponent: () =>
      import('./admin/news-admin/news-admin-list.component').then(
        m => m.NewsAdminListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_NEWS, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_NEWS_ADD,
    loadComponent: () =>
      import('./admin/news-admin/news-admin-form.component').then(
        m => m.NewsAdminFormComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_NEWS_ADD, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_NEWS_EDIT,
    loadComponent: () =>
      import('./admin/news-admin/news-admin-form.component').then(
        m => m.NewsAdminFormComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_NEWS_EDIT, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_BANNERS,
    loadComponent: () =>
      import('./admin/banner-admin/banner-admin-list.component').then(
        m => m.BannerAdminListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_BANNERS, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_BANNERS_ADD,
    loadComponent: () =>
      import('./admin/banner-admin/banner-admin-form.component').then(
        m => m.BannerAdminFormComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_BANNERS_ADD, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_BANNERS_EDIT,
    loadComponent: () =>
      import('./admin/banner-admin/banner-admin-form.component').then(
        m => m.BannerAdminFormComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_BANNERS_EDIT, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_NOTIFICATIONS,
    loadComponent: () =>
      import('./admin/notification-admin/notification-admin-list.component').then(
        m => m.NotificationAdminListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_NOTIFICATIONS, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_NOTIFICATIONS_SEND,
    loadComponent: () =>
      import('./admin/notification-admin/notification-admin-send.component').then(
        m => m.NotificationAdminSendComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.ADMIN_NOTIFICATIONS_SEND,
      requiresApi: true,
    },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_REPORTS,
    loadComponent: () =>
      import('./admin/moderation-admin/report-admin-list.component').then(
        m => m.ReportAdminListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_REPORTS, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.ADMIN_USERS,
    loadComponent: () =>
      import('./admin/moderation-admin/user-admin-list.component').then(
        m => m.UserAdminListComponent,
      ),
    data: { title: APP_ROUTE_TITLES.ADMIN_USERS, requiresApi: true },
    canActivate: [AdminGuard, ApiRequiredGuard],
  },

  // *****************************************
  // * STO App routes
  {
    path: APP_ROUTES.STO_DASHBOARD,
    component: DashboardComponent,
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_DASHBOARD_PROFILE,
    component: ProfileComponent,
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD_PROFILE, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_DASHBOARD_SETTINGS,
    loadComponent: () =>
      import('./dashboard/settings/settings.component').then(
        m => m.SettingsComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD_SETTINGS, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_DASHBOARD_ACCOUNTS,
    component: AccountsComponent,
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD_ACCOUNTS, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_ACCOUNT_ADD,
    loadComponent: () =>
      import('./dashboard/accounts/account-manage/account-manage.component').then(
        m => m.AccountManageComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_ACCOUNT_ADD, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_ACCOUNT_EDIT,
    loadComponent: () =>
      import('./dashboard/accounts/account-manage/account-manage.component').then(
        m => m.AccountManageComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_ACCOUNT_EDIT, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_ACCOUNT_DETAIL,
    loadComponent: () =>
      import('./dashboard/accounts/account-detail/account-detail.component').then(
        m => m.AccountDetailComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_ACCOUNT_DETAIL, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_ACCOUNT_ENDEAVOURS,
    loadComponent: () =>
      import('./dashboard/endeavours/endeavours.component').then(
        m => m.EndeavoursComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_ACCOUNT_ENDEAVOURS, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_CHARACTER_DETAIL,
    loadComponent: () =>
      import('./dashboard/characters/character-detail/character-detail.component').then(
        m => m.CharacterDetailComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_CHARACTER_DETAIL, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_CHARACTER_ADD,
    loadComponent: () =>
      import('./dashboard/characters/character-manage/character-manage.component').then(
        m => m.CharacterManageComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_CHARACTER_ADD, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_CHARACTER_EDIT,
    loadComponent: () =>
      import('./dashboard/characters/character-manage/character-manage.component').then(
        m => m.CharacterManageComponent,
      ),
    data: { title: APP_ROUTE_TITLES.STO_CHARACTER_EDIT, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_DASHBOARD_STATS,
    loadComponent: () =>
      import('./dashboard/stats/stats.component').then(m => m.StatsComponent),
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD_STATS, requiresApi: true },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },
  {
    path: APP_ROUTES.STO_DASHBOARD_STATS_DETAIL,
    loadComponent: () =>
      import('./dashboard/stats/stat-detail/stat-detail.component').then(
        m => m.StatDetailComponent,
      ),
    data: {
      title: APP_ROUTE_TITLES.STO_DASHBOARD_STATS_DETAIL,
      requiresApi: true,
    },
    canActivate: [AuthGuard, ApiRequiredGuard],
  },

  // *****************************************
  // * Storytime
  {
    path: APP_ROUTES.STORYTIME,
    loadChildren: () =>
      import('./storytime/storytime.routes').then(m => m.STORYTIME_ROUTES),
    data: { title: APP_ROUTE_TITLES.STORYTIME, requiresApi: true },
    canActivate: [ApiRequiredGuard],
  },

  // *****************************************
  // * Errors
  {
    path: APP_ROUTES.SERVICE_INTERRUPTION,
    component: ServiceInterruptionComponent,
    data: { title: APP_ROUTE_TITLES.SERVICE_INTERRUPTION, requiresApi: true },
  },
  {
    path: '**',
    component: PageNotFoundComponent,
    data: { title: APP_ROUTE_TITLES.PAGE_NOT_FOUND },
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
