import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { combineLatest, distinctUntilChanged, map } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { ChatSocketService } from './chat-socket.service';

/**
 * Keeps chat's socket open for as long as somebody is signed in and chat is
 * switched on, across the whole site (FC-034).
 *
 * Steve's decision of 29 September 2026: being online means having STO Info
 * open, not only the chat page, so every signed-in tab holds a socket — which
 * also lets a direct message or a mention reach the reader wherever they are.
 * Signing out, or chat being switched off, closes it.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatSessionService {
  private readonly _auth = inject(AuthService);
  private readonly _configuration = inject(FleetConfigurationService);
  private readonly _socket = inject(ChatSocketService);
  private readonly _destroyRef = inject(DestroyRef);

  private _started = false;

  /**
   * Starts keeping the socket open while it should be. Once is enough.
   */
  start(): void {
    if (this._started) {
      return;
    }

    this._started = true;
    combineLatest([
      this._auth.isAuthenticated$,
      this._configuration
        .getFeatures()
        .pipe(map(features => features.chatEnabled)),
    ])
      .pipe(
        map(([signedIn, chatEnabled]) => signedIn && chatEnabled),
        distinctUntilChanged(),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(open => {
        if (open) {
          void this._socket.ready().catch(() => undefined);
        } else {
          this._socket.disconnect();
        }
      });
  }
}
