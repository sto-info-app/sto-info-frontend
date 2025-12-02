import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { EnvCheckService } from './environments/environment.service';

if (environment.production) {
  enableProdMode();
}

const envCheckService = new EnvCheckService();
envCheckService.checkEnvVariables(); // Validate the environment variables

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    applicationProviders: [provideZoneChangeDetection()],
  })
  .catch(err => console.error(err));
