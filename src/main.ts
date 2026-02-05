import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
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
import { Router, RouterModule, provideRouter } from '@angular/router';
import { JwtModule } from '@auth0/angular-jwt';

import * as Sentry from '@sentry/angular';
import { routes } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { API_URLS } from './app/shared/constants/api-routing.constants';
import { FontAwesomeIconService } from './app/shared/services/font-awesome-icon.service';
import { environment } from './environments/environment';
import { EnvCheckService } from './environments/environment.service';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.env_name ?? 'dev',
    release: `sto-info-frontend@${environment.version}`,

    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: false,

    // Integrations
    integrations: [Sentry.replayIntegration()],

    // Error Sampling
    sampleRate: 1,
    tracesSampleRate: 0.2,

    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.

    // Error Filtering
    ignoreErrors: ['ResizeObserver loop limit exceeded'],

    // Error Processing
    beforeSend(event) {
      return event;
    },
  });
}

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
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
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
      deps: [Sentry.TraceService],
    },
  ],
};

const envCheckService = new EnvCheckService();
envCheckService.checkEnvVariables(); // Validate the environment variables

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
