import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { ManagedStory } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { StoryService } from '../../story.service';
import {
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
} from '../../storytime.constants';

/**
 * Asking a creator to accept the publishing terms for one Story.
 *
 * Shown wherever publishing that Story is offered — the list of a creator's
 * work, and the editor they publish from — because being refused a publish and
 * then sent somewhere else to find the confirmation is a worse answer than
 * being asked for it where the refusal happened.
 *
 * It renders nothing at all when the Story's acceptance is current, so a caller
 * can place it unconditionally rather than repeating the test.
 */
@Component({
  selector: 'app-storytime-content-policy-panel',
  templateUrl: './content-policy-panel.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, LcarsErrorMessageComponent],
})
export class ContentPolicyPanelComponent {
  /** The Story the terms are being accepted for. */
  @Input({ required: true }) story!: ManagedStory;

  /**
   * What to call the panel where it stands as a block of the page.
   *
   * Left unset inside a row of somebody's own work, where the card around it
   * already names the Story and a second heading bar would say it twice.
   */
  @Input() heading = '';

  /** Announces the accepted Story, so the caller can show its new state. */
  @Output() readonly accepted = new EventEmitter<ManagedStory>();

  /** A message to show when the acceptance could not be recorded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /**
   * What the creator confirms when they accept.
   *
   * The same list the Content Policy and Terms pages set out, so a creator
   * cannot be shown one set of promises and asked to make another.
   */
  readonly representations = PUBLISHING_REPRESENTATIONS;

  private readonly _storyService = inject(StoryService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Whether the creator still has to accept the publishing terms.
   *
   * Asks the server's verdict rather than checking for a date, because a
   * creator who accepted superseded wording has a date and still has to agree
   * again — and only the server knows which version is current.
   *
   * @returns True when the current terms have not been accepted for it.
   */
  get isNeeded(): boolean {
    return !this.story.contentPolicyCurrent;
  }

  /**
   * Whether the creator is being asked again rather than for the first time.
   *
   * Worth distinguishing: being told to do something a second time is
   * confusing unless you are told why.
   *
   * @returns True when they accepted wording that has since been replaced.
   */
  get isSuperseded(): boolean {
    return this.isNeeded && this.story.contentPolicyAcceptedAt !== null;
  }

  /**
   * Records that the creator accepts the publishing terms for this Story.
   */
  accept(): void {
    this.errorMessage = '';

    this._storyService
      .acceptContentPolicy(this.story.id)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: story => this.accepted.emit(story),
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'That could not be recorded. Please try again shortly.';
        },
      });
  }
}
