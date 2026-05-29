import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Environment } from './models/environment.model';

@Injectable({ providedIn: 'root' })
export class EnvCheckService {
  /**
   * Validates that all environment keys are defined.
   *
   * @throws Error when one or more environment values are missing.
   */
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
