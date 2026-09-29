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

  private readonly _logRocketAppId = environment.logRocketAppId ?? null;
  private initialised = false;

  private readonly _sharedDataService = inject(SharedDataService);

  /**
   * Unsubscribe from the Observables when the component is destroyed
   * @return void
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialise LogRocket
   * @return void
   */
  public init(): void {
    if (this._logRocketAppId) {
      LogRocket.init(this._logRocketAppId, this.getInitOptions());
      this.initialised = true;

      // Check the user ID when it changes
      this.userIdSubscription = this._sharedDataService.userId
        .pipe(takeUntil(this.destroy$))
        .subscribe(userId => {
          // Identify the user in LogRocket
          this.identify(userId);
        });
    }
  }

  /**
   * Shutdown LogRocket
   * @return void
   */
  public shutdown(): void {
    if (this.initialised) {
      LogRocket.init(' ');
      this.initialised = false;
    }
  }

  /**
   * Get the initialisation status
   * @return True if LogRocket has been initialised
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

  /**
   * The LogRocket init options (FC-038): nothing a person types, reads or
   * sends reaches it. Every text and input on the page is masked, and every
   * request and response loses its body and its credentials, so a roster, a
   * chat message or a form's content never leaves the browser this way.
   * @return The LogRocket init options.
   */
  private getInitOptions(): Parameters<typeof LogRocket.init>[1] {
    return {
      dom: { textSanitizer: true, inputSanitizer: true },
      network: {
        requestSanitizer: request =>
          request && {
            ...request,
            body: undefined,
            headers: withoutCredentials(request.headers),
          },
        responseSanitizer: response =>
          response && {
            ...response,
            body: undefined,
            headers: withoutCredentials(response.headers),
          },
      },
    } satisfies Parameters<typeof LogRocket.init>[1];
  }
}

/**
 * Headers without anything that proves who somebody is.
 * @param headers The headers LogRocket captured.
 * @returns A copy without authorization or cookies.
 */
function withoutCredentials(
  headers: Record<string, string | null | undefined>,
): Record<string, string | null | undefined> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => !/^(authorization|cookie|set-cookie)$/i.test(name),
    ),
  );
}
