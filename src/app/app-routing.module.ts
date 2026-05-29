import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
    path: APP_ROUTES.STO_DASHBOARD_ACCOUNTS,
    component: AccountsComponent,
    data: { title: APP_ROUTE_TITLES.STO_DASHBOARD_ACCOUNTS, requiresApi: true },
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
