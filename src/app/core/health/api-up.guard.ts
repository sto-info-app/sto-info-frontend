import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { API_HEALTH_STATE_DOWN } from 'src/app/shared/constants/health.constants';
import { HealthService } from './health.service';

@Injectable({ providedIn: 'root' })
export class ApiUpGuard implements CanActivate {
  private readonly health = inject(HealthService);
  private readonly router = inject(Router);

  /**
   * Allows access only when the API is reported as healthy.
   *
   * @returns `true` when the API is up, otherwise a redirect tree to the service interruption page.
   */
  canActivate(): boolean | UrlTree {
    const state = this.health.snapshot();

    if (state === API_HEALTH_STATE_DOWN) {
      return this.router.parseUrl('/service-interruption');
    }
    return true;
  }
}
