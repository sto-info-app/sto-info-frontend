import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  MAT_RIPPLE_GLOBAL_OPTIONS,
  RippleGlobalOptions,
} from '@angular/material/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, provideRouter } from '@angular/router';
import { JwtModule } from '@auth0/angular-jwt';

import { routes } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { API_URLS } from './app/shared/constants/api-routing.constants';
import { FontAwesomeIconService } from './app/shared/services/font-awesome-icon.service';
import { EnvCheckService } from './environments/environment.service';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes),
    importProvidersFrom(
      RouterModule,
      BrowserAnimationsModule,
      JwtModule.forRoot({
        config: {
          tokenGetter: tokenGetter,
          allowedDomains: [new URL(API_URLS.ROOT).host],
          disallowedRoutes: [],
        },
      }),
    ),
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
    {
      provide: 'API_URL',
      useValue: API_URLS.ROOT,
    },
    { provide: LocationStrategy, useClass: PathLocationStrategy },
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => () => {
        // Force creation so its constructor registers icons
        inject(FontAwesomeIconService);
      },
    },
  ],
};

const envCheckService = new EnvCheckService();
envCheckService.checkEnvVariables(); // Validate the environment variables

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
