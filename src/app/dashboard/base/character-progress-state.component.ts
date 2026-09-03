import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LcarsAllegianceLockComponent } from 'src/app/shared/components/lcars-allegiance-lock/lcars-allegiance-lock.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsLevelLockComponent } from 'src/app/shared/components/lcars-level-lock/lcars-level-lock.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';

/** Shared loading, error, heading and lock state for progress trackers. */
@Component({
  selector: 'app-character-progress-state',
  templateUrl: './character-progress-state.component.html',
  styleUrls: ['./character-progress-state.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsLevelLockComponent,
    LcarsAllegianceLockComponent,
  ],
})
export class CharacterProgressStateComponent {
  @Input() isLoading = false;
  @Input() errorMessage = '';
  @Input() accountsLink = '';
  @Input() embedded = false;
  @Input() title = '';
  @Input() characterHandle = '';
  @Input() accountHandle = '';
  @Input() levelLocked = false;
  @Input() featureName = '';
  @Input() unlockLevel = 1;
  @Input() characterLevel: number | null = null;
  @Input() characterEditLink: string[] = [];
  /** Whether the tracker is withheld pending a general allegiance. */
  @Input() allegianceLocked = false;
  /** The captain's recorded allegiance, shown by the allegiance notice. */
  @Input() characterAllegiance: string | null = null;
}
