import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DebuggingService {
  allowDebugging(): boolean {
    if (environment.production) return false;
    if (environment.allowDebugging) return environment.allowDebugging;
    return false;
  }
}
