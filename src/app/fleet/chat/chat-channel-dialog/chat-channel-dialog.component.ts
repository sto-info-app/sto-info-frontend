import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  ChatChannel,
  ChatChannelInput,
  ChatRole,
} from 'src/app/models/fleet-chat.models';

import { CHAT_ROLE_LABELS, CHAT_ROLES } from '../chat.text';

/** What the channel editor is opened with. */
export interface ChatChannelDialogData {
  /** Where the channel is, to say in the heading. */
  readonly scopeName: string;
  /** The channel being changed, or null for a new one. */
  readonly channel: ChatChannel | null;
}

/** The longest channel name, as the server allows. */
const NAME_MAX = 50;

/**
 * Adds or changes a custom channel (FC-033): its name, the least role that
 * reads it and the least that posts, never looser than reading. Closes with
 * what was chosen, or undefined when cancelled; the page saves it.
 */
@Component({
  selector: 'app-chat-channel-dialog',
  templateUrl: './chat-channel-dialog.component.html',
  styleUrls: ['./chat-channel-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatChannelDialogComponent {
  readonly data: ChatChannelDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatChannelDialogComponent, ChatChannelInput>,
  );

  readonly nameMax = NAME_MAX;
  readonly roles = CHAT_ROLES;
  readonly roleLabels = CHAT_ROLE_LABELS;

  readonly name = signal(this.data.channel?.name ?? '');
  readonly readRole = signal<ChatRole>(this.data.channel?.readRole ?? 'MEMBER');
  readonly postRole = signal<ChatRole>(this.data.channel?.postRole ?? 'MEMBER');

  /** The posting roles on offer: the reading role and above. */
  readonly postRoles = computed(() =>
    CHAT_ROLES.slice(CHAT_ROLES.indexOf(this.readRole())),
  );

  /** Whether the name is one the server accepts. */
  readonly isValid = computed(
    () =>
      this.name().trim().length > 0 && this.name().trim().length <= NAME_MAX,
  );

  /**
   * Sets who may read, lifting the posting role with it where needed.
   *
   * @param role - The least role that reads.
   */
  protected chooseReadRole(role: ChatRole): void {
    this.readRole.set(role);

    if (CHAT_ROLES.indexOf(this.postRole()) < CHAT_ROLES.indexOf(role)) {
      this.postRole.set(role);
    }
  }

  /**
   * Sets who may post.
   *
   * @param role - The least role that posts.
   */
  protected choosePostRole(role: ChatRole): void {
    this.postRole.set(role);
  }

  /**
   * Sets the name as typed.
   *
   * @param value - The name.
   */
  protected setName(value: string): void {
    this.name.set(value);
  }

  /** Closes with the channel as chosen. */
  protected save(): void {
    if (!this.isValid()) {
      return;
    }

    this._dialogRef.close({
      name: this.name().trim(),
      readRole: this.readRole(),
      postRole: this.postRole(),
    });
  }

  /** Closes without changing anything. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
