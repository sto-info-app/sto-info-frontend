import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { InfoComponent } from './info/info.component';
import { LcarsErrorMessageComponent } from './lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from './lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from './lcars-success-message/lcars-success-message.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RegistrationCompleteComponent } from './registration-complete/registration-complete.component';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { DashboardComponent } from './dashboard/dashboard.component';

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
    InfoComponent,
    LcarsErrorMessageComponent,
    VerifyEmailComponent,
    LcarsSuccessMessageComponent,
    RegistrationCompleteComponent,
    LcarsInformationMessageComponent,
    TermsOfUseComponent,
    DashboardComponent,
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
  ],
  providers: [
    {
      provide: 'API_URL',
      useValue: environment.apiUrl,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
