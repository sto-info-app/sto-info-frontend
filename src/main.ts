import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  MAT_RIPPLE_GLOBAL_OPTIONS,
  RippleGlobalOptions,
} from '@angular/material/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { JwtModule } from '@auth0/angular-jwt';

import * as Sentry from '@sentry/angular';
import { routes } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { apiHealthInterceptor } from './app/core/health/api-health.interceptor';
import { API_URLS } from './app/shared/constants/api-routing.constants';
import { environment } from './environments/environment';
import { EnvCheckService } from './environments/environment.service';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

if (
  environment.sentryDsn &&
  environment.env_name !== 'local' &&
  environment.env_name !== 'lighthouse-audit'
) {
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
    provideAnimationsAsync(),
    importProvidersFrom(
      RouterModule,
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
    provideHttpClient(withInterceptors([apiHealthInterceptor])),
  ],
};

const envCheckService = new EnvCheckService();
envCheckService.checkEnvVariables(); // Validate the environment variables

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
