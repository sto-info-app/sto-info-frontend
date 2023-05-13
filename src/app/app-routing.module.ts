import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { LoginComponent } from './core/login/login.component';
import { RegisterComponent } from './core/register/register.component';
import { RegistrationCompleteComponent } from './core/registration-complete/registration-complete.component';
import { VerifyEmailComponent } from './core/verify-email/verify-email.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },

  // User auth, registration and validation
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'register/complete',
    component: RegistrationCompleteComponent,
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
  },

  // Static pages
  {
    path: 'about',
    component: AboutComponent,
  },
  {
    path: 'contact',
    component: ContactComponent,
  },
  {
    path: 'terms-of-use',
    component: TermsOfUseComponent,
  },

  // STO App routes
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
