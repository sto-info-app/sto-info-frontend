import { Injectable, OnDestroy, inject } from '@angular/core';
import LogRocket from 'logrocket';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SharedDataService } from './shared-data.service';

@Injectable({
  providedIn: 'root',
})
export class LogRocketService implements OnDestroy {
  destroy$ = new Subject<void>();
  userIdSubscription: Subscription | undefined;

  private readonly logRocketAppId = environment.logRocketAppId ?? null;
  private initialised = false;

  private readonly sharedDataService = inject(SharedDataService);

  /**
   * Unsubscribe from the Observables when the component is destroyed
   */
  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  /***
   * Initialise LogRocket
   */
  public init(): void {
    if (this.logRocketAppId) {
      LogRocket.init(this.logRocketAppId);
      this.initialised = true;

      // Check the user ID when it changes
      this.userIdSubscription = this.sharedDataService.userId
        .pipe(takeUntil(this.destroy$))
        .subscribe(userId => {
          // Identify the user in LogRocket
          this.identify(userId);
        });
    }
  }

  /**
   * Shutdown LogRocket
   */
  public shutdown(): void {
    if (this.initialised) {
      LogRocket.init(' ');
      this.initialised = false;
    }
  }

  /**
   * Get the initialisation status
   */
  public get isInitialised(): boolean {
    return this.initialised;
  }

  /**
   * Identify the user in LogRocket
   * @param userId The user ID
   */
  public identify(userId: string): void {
    if (this.initialised) {
      LogRocket.identify(userId);
    }
  }
}
