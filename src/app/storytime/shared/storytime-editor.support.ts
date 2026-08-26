import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, DestroyRef, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { StorytimeLanguage } from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { StorytimeService } from '../storytime.service';
import { SettingOption } from './setting-help/setting-help.component';

/**
 * The languages, as a setting chooser shows them.
 *
 * There is no explanation against each: there are hundreds, and "English"
 * needs no gloss.
 *
 * @param languages - The languages the server accepts.
 * @returns One choice per language.
 */
export function toLanguageOptions(
  languages: StorytimeLanguage[],
): SettingOption[] {
  return languages.map(language => ({
    value: language.code,
    label: language.name,
  }));
}

/** What an editor shows progress, failure and language choices on. */
export interface StorytimeEditorHost {
  /** Whether a save is in flight. */
  isSaving: boolean;

  /** What to tell the creator when saving failed. */
  errorMessage: string;

  /** The languages the server will accept. */
  languages: StorytimeLanguage[];
}

/**
 * The parts every Storytime editor does the same way.
 *
 * A Story, an Arc and a Chapter are edited by three separate forms, but they
 * are saved identically: refuse an incomplete form, send the version so a
 * stale edit is refused rather than overwriting, and on success go to where
 * the saved work is managed. Keeping that in one place is what stops the three
 * editors from disagreeing about, say, whether the server's own complaint is
 * worth repeating.
 *
 * Construct it in an injection context, so it can take the component's own
 * destroy, zone and change detection references.
 */
export class StorytimeEditorSupport {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _router = inject(Router);
  private readonly _storytimeService = inject(StorytimeService);

  /**
   * @param _host - The editor whose progress, error and languages to keep.
   */
  constructor(private readonly _host: StorytimeEditorHost) {}

  /**
   * Fills the editor's language choices from the server.
   */
  loadLanguages(): void {
    this._storytimeService
      .getLanguages()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(languages => {
        this._host.languages = languages;
      });
  }

  /**
   * Checks the form over and builds what to send.
   *
   * @param form - The editor's form.
   * @param version - The version of the work being edited, if it exists yet.
   * @returns The payload to send, or null when there is nothing to save.
   */
  beginSave(form: FormGroup, version?: number): Record<string, unknown> | null {
    if (form.invalid || this._host.isSaving) {
      form.markAllAsTouched();
      return null;
    }

    this._host.isSaving = true;
    this._host.errorMessage = '';

    const payload = { ...form.value } as Record<string, unknown>;

    // The version goes with an update so a stale edit is refused rather than
    // silently overwriting a change made elsewhere.
    if (version !== undefined) {
      payload['version'] = version;
    }

    return payload;
  }

  /**
   * Sends the save, then goes to where the saved work is managed.
   *
   * @param request - The save.
   * @param destination - The route under Storytime to go to, from the new id.
   * @param failureMessage - What to say when the server explains nothing.
   */
  save<T extends { id: string }>(
    request: Observable<T>,
    destination: (savedId: string) => string[],
    failureMessage: string,
  ): void {
    request
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: saved => {
          this._host.isSaving = false;
          void this._router.navigate([
            '/',
            APP_ROUTES.STORYTIME,
            ...destination(saved.id),
          ]);
        },
        error: (error: HttpErrorResponse) => {
          this._host.isSaving = false;
          // The server names the specific problem — a slug already taken, or
          // an edit somebody else got in first — which is more use to a
          // creator than a generic failure would be.
          this._host.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            failureMessage;
        },
      });
  }
}
