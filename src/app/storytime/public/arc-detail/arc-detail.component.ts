import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { Arc, ArcMembership } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ArcService } from '../../arc.service';

/**
 * An Arc's own page: a reading order somebody has curated.
 *
 * The description arrives as HTML the server has already rendered and
 * sanitised, and is trusted here rather than re-sanitised for the same reason
 * it is everywhere else in Storytime: the server is the security boundary.
 */
@Component({
  selector: 'app-arc-detail',
  templateUrl: './arc-detail.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ArcDetailComponent implements OnInit {
  /** The Arc being read. */
  arc: Arc | null = null;

  /** The Stories a reader can follow through it, in order. */
  stories: ArcMembership[] = [];

  /** The rendered description, ready to insert. */
  descriptionHtml: SafeHtml | null = null;

  /** Whether the Arc is still loading. */
  isLoading = true;

  /** A message to show when the Arc could not be loaded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Arc named in the route.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';

          return this._arcService.getArc(params.get('arcSlug') ?? '');
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: result => {
          this.arc = result.arc;
          this.stories = result.stories;
          this.descriptionHtml = result.arc.descriptionHtml
            ? // NOSONAR - server-rendered and sanitised; see the class comment.
              this._sanitizer.bypassSecurityTrustHtml(
                result.arc.descriptionHtml,
              )
            : null;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Arc could not be found. It may have been removed or made private.'
              : 'This Arc could not be read. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }
}
