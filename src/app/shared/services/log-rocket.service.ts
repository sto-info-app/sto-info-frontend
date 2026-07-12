import { Injectable, OnDestroy, inject } from '@angular/core';
import LogRocket from 'logrocket';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SharedDataService } from './shared-data.service';

@Injectable({
  providedIn: 'root',
})
export class LogRocketService implements OnDestroy {
  private static readonly _REDACTED_VALUE = '[REDACTED]';

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
   * Build the LogRocket init options with a network request sanitizer that redacts passwords.
   * @return The LogRocket init options.
   */
  private getInitOptions(): Parameters<typeof LogRocket.init>[1] {
    return {
      network: {
        requestSanitizer: request => {
          if (!request) {
            return request;
          }
          return this.sanitizeNetworkRequest(
            request as unknown as { body?: string; [key: string]: unknown },
          ) as unknown as typeof request;
        },
      },
    } satisfies Parameters<typeof LogRocket.init>[1];
  }

  /**
   * Apply redaction to password fields within the network request body when present.
   * @param request The network request captured by LogRocket.
   * @returns The original request when no redaction occurred, otherwise a cloned sanitized copy.
   */
  private sanitizeNetworkRequest<
    T extends { body?: string; [key: string]: unknown },
  >(request: T): T {
    if (typeof request.body !== 'string') {
      return request;
    }

    const sanitizedBody = this.getRedactedBody(request.body);
    if (!sanitizedBody) {
      return request;
    }

    return {
      ...request,
      body: sanitizedBody,
    };
  }

  /**
   * Attempt to redact sensitive fields inside a JSON request payload.
   * @param body The JSON string submitted to an auth endpoint.
   * @returns The redacted JSON string or null when no sensitive values were found.
   */
  private getRedactedBody(body: string): string | null {
    try {
      const parsedBody = JSON.parse(body);
      const wasRedacted = this.redactSensitiveFields(parsedBody);

      if (!wasRedacted) {
        return null;
      }

      return JSON.stringify(parsedBody);
    } catch {
      return null;
    }
  }

  /**
   * Recursively scan an object graph and replace password fields with the redacted marker.
   * @param target Any JSON-compatible value.
   * @returns True when at least one value was redacted.
   */
  private redactSensitiveFields(target: unknown): boolean {
    if (Array.isArray(target)) {
      return target.reduce<boolean>((changed, value) => {
        return this.redactSensitiveFields(value) || changed;
      }, false);
    }

    if (!target || typeof target !== 'object') {
      return false;
    }

    let wasUpdated = false;
    Object.entries(target as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (this.isSensitiveKey(key) && typeof value === 'string') {
          (target as Record<string, unknown>)[key] =
            LogRocketService._REDACTED_VALUE;
          wasUpdated = true;
          return;
        }

        if (typeof value === 'object' && value !== null) {
          wasUpdated = this.redactSensitiveFields(value) || wasUpdated;
        }
      },
    );

    return wasUpdated;
  }

  /**
   * Determine if the property name implies that it contains password data.
   * @param key The field name being inspected.
   * @returns True when the key contains the substring "password" (case-insensitive).
   */
  private isSensitiveKey(key: string): boolean {
    return key.toLowerCase().includes('password');
  }
}
