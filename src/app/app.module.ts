import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import {
  FaIconLibrary,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { faHandSpock } from '@fortawesome/free-solid-svg-icons';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChangePasswordComponent } from './core/auth/change-password/change-password.component';
import { ResetPasswordRequestComponent } from './core/auth/reset-password-request/reset-password-request.component';
import { LoginComponent } from './core/login/login.component';
import { RegisterComponent } from './core/register/register.component';
import { RegistrationCompleteComponent } from './core/registration-complete/registration-complete.component';
import { VerifyEmailComponent } from './core/verify-email/verify-email.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { LcarsErrorMessageComponent } from './shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from './shared/components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from './shared/components/lcars-success-message/lcars-success-message.component';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';

// NOTE: This imports all icons into the bundle and increases app size!
// import { fas } from '@fortawesome/pro-solid-svg-icons';
// import { far } from '@fortawesome/pro-regular-svg-icons';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ContactComponent,
    AboutComponent,
    LcarsErrorMessageComponent,
    VerifyEmailComponent,
    LcarsSuccessMessageComponent,
    RegistrationCompleteComponent,
    LcarsInformationMessageComponent,
    TermsOfUseComponent,
    DashboardComponent,
    ResetPasswordRequestComponent,
    ChangePasswordComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: [new URL(environment.apiUrl).host],
        disallowedRoutes: [],
      },
    }),
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
  ],
  providers: [
    {
      provide: 'API_URL',
      useValue: environment.apiUrl,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    // Add an individual FontAwesome icon to the library for convenient access in other components
    // NOTE: Use `<fa-icon [icon]="['fas', 'hand-spock']"></fa-icon>` to use icon in the HTML
    // NOTE: FontAwesome prefixes are: fas = solid, far = regular, fal = light, fat = thin, fad = duotone
    library.addIcons(faHandSpock);

    // Add entire icon packs
    // NOTE: This imports all icons into the bundle and increases app size!
    // library.addIconPacks(fas, far);
  }
}
