import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { map, take, tap } from 'rxjs';
import { API_HEALTH_STATE_DOWN } from 'src/app/shared/constants/health.constants';
import { HealthService } from './health.service';

@Injectable({ providedIn: 'root' })
export class ApiRequiredGuard implements CanActivate {
  private readonly _backendHealth: HealthService = inject(HealthService);

  canActivate() {
    return this._backendHealth.checkOnce().pipe(
      take(1),
      tap(state =>
        state === API_HEALTH_STATE_DOWN
          ? this._backendHealth.markDown()
          : this._backendHealth.markUp(),
      ),
      map(() => true), // Always allow navigation; UI swap happens in MainContentComponent
    );
  }
}
