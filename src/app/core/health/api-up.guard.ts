import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { API_HEALTH_STATE_DOWN } from 'src/app/shared/constants/health.constants';
import { HealthService } from './health.service';

@Injectable({ providedIn: 'root' })
export class ApiUpGuard implements CanActivate {
  private readonly health = inject(HealthService);
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    const state = this.health.snapshot();

    if (state === API_HEALTH_STATE_DOWN) {
      return this.router.parseUrl('/service-interruption');
    }
    return true;
  }
}
