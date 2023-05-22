import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { ChangePasswordComponent } from './core/auth/change-password/change-password.component';
import { ResetPasswordRequestComponent } from './core/auth/reset-password-request/reset-password-request.component';
import { LoginComponent } from './core/login/login.component';
import { RegisterComponent } from './core/register/register.component';
import { RegistrationCompleteComponent } from './core/registration-complete/registration-complete.component';
import { VerifyEmailComponent } from './core/verify-email/verify-email.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PageNotFoundComponent } from './error-pages/page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { ROUTES } from './shared/constants/app-routing.constants';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';

const routes: Routes = [
  // *****************************************
  // * Default route
  {
    path: '',
    component: HomeComponent,
  },

  // *****************************************
  // * User auth, registration and validation
  {
    path: ROUTES.LOGIN,
    component: LoginComponent,
  },
  {
    path: ROUTES.REGISTER,
    component: RegisterComponent,
  },
  {
    path: ROUTES.REGISTER_COMPLETE,
    component: RegistrationCompleteComponent,
  },
  {
    path: ROUTES.VERIFY_EMAIL,
    component: VerifyEmailComponent,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    component: ResetPasswordRequestComponent,
  },
  {
    path: ROUTES.CHANGE_PASSWORD,
    component: ChangePasswordComponent,
  },

  // *****************************************
  // * Static pages
  {
    path: ROUTES.ABOUT,
    component: AboutComponent,
  },
  {
    path: ROUTES.CONTACT,
    component: ContactComponent,
  },
  {
    path: ROUTES.TERMS_OF_USE,
    component: TermsOfUseComponent,
  },

  // *****************************************
  // * STO App routes
  {
    path: ROUTES.STO_DASHBOARD,
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },

  // *****************************************
  // * Errors
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
