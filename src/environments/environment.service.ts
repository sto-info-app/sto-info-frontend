import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Environment } from './models/environment.model';

@Injectable({ providedIn: 'root' })
export class EnvCheckService {
  checkEnvVariables(): void {
    const envKeys = Object.keys(environment) as (keyof Environment)[];
    const missingKeys = envKeys.filter(
      key => environment[key] === null || environment[key] === undefined,
    );

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}`,
      );
    }
  }
}
