import { enableProdMode } from '@angular/core';
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
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
