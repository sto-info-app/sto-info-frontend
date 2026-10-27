import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';

import { ChatService } from 'src/app/fleet/chat/chat.service';

/** What a page says when the conversation could not be opened. */
export const FRIEND_CHAT_FAILED = 'The conversation could not be opened.';

/**
 * Opens chat with a friend (FC-033) from the community pages: a profile, the
 * registry's cards and the friends list. Each names the friendship rather
 * than the friend's ID, which a profile does not carry.
 */
@Injectable({ providedIn: 'root' })
export class FriendChatService {
  private readonly _chat = inject(ChatService);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);

  /**
   * Opens the conversation and goes to it. The page waits on the result to
   * clear its busy state, or to say why it failed.
   *
   * @param friendshipId - The friendship.
   * @returns Emits once the conversation is open and on its way to the
   *   screen, then completes; errors when it could not be opened.
   */
  open(friendshipId: string): Observable<void> {
    return this._chat.open({ friendshipId }).pipe(
      take(1),
      map(conversation => {
        // The HTTP callback can land outside the zone (see observeInZone).
        this._ngZone.run(
          () =>
            void this._router.navigate(['/chat', 'direct', conversation.id]),
        );
      }),
    );
  }
}
