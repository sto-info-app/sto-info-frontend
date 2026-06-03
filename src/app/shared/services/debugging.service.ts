import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DebuggingService {
  /**
   * Determines whether debugging features should be enabled.
   *
   * @returns `true` when debugging is explicitly allowed in a non-production environment.
   */
  allowDebugging(): boolean {
    if (environment.production) return false;
    if (environment.allowDebugging) return environment.allowDebugging;
    return false;
  }
}
