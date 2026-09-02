import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, DestroyRef, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { StorytimeLanguage } from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { STORYTIME_IMAGE_ALT_MAX_LENGTH } from '../storytime-image.constants';
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

/**
 * Puts an artwork description on a form, or takes it off.
 *
 * The control exists only while the picture does. A description is required
 * whenever there is something to describe and refused when there is not, so a
 * form that always carried the field would send an empty one on every save of
 * a work with no artwork and be turned away for it.
 *
 * @param form - The editor's form.
 * @param controlName - The control holding the description.
 * @param imageUrl - The picture, or null when the slot is empty.
 * @param altText - The description the server holds, if any.
 */
export function syncImageDescription(
  form: FormGroup,
  controlName: string,
  imageUrl: string | null,
  altText: string | null,
): void {
  if (!imageUrl) {
    form.removeControl(controlName);
    return;
  }

  const control = form.get(controlName);

  if (control) {
    control.setValue(altText ?? '');
    return;
  }

  form.addControl(
    controlName,
    new FormControl(altText ?? '', [
      Validators.required,
      Validators.maxLength(STORYTIME_IMAGE_ALT_MAX_LENGTH),
    ]),
  );
}

/** What an editor shows progress, failure and language choices on. */
export interface StorytimeEditorHost {
  /** Whether a save is in flight. */
  isSaving: boolean;

  /** What to tell the creator when saving failed. */
  errorMessage: string;

  /** The languages the server will accept. */
  languages: StorytimeLanguage[];

  /**
   * Takes the work back as the server now holds it.
   *
   * Saving does not always take a creator off the page: an existing Chapter
   * and an existing Story are both managed at the address they are saved
   * from, so the navigation that follows a save is a no-op and the editor
   * stays on screen with whatever it was holding. Every save moves the
   * version on, so an editor that did not take the saved work back would have
   * its next save refused as stale — from a page that looks untouched.
   *
   * Optional, for editors whose every save leads somewhere else.
   *
   * @param saved - The work as the server now holds it.
   */
  onSaved?(saved: { id: string }): void;
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
   * An editor that also publishes passes the publish as `then`, so the two
   * happen in that order against one set of edits. Publishing what is on the
   * screen means saving it first — a creator who presses Publish after typing
   * has every right to expect what they typed to be what goes out — and a
   * failure at either step leaves them where they are with the server's own
   * explanation rather than halfway through.
   *
   * @param request - The save.
   * @param destination - The route under Storytime to go to, from the new id.
   * @param failureMessage - What to say when the server explains nothing.
   * @param then - Anything to do with the saved work before leaving the page.
   *   It is handed the saved work rather than only its identifier, so an
   *   editor can hold on to what was created: a follow-up that fails then
   *   leaves the editor editing that work rather than offering to create it
   *   a second time.
   */
  save<T extends { id: string }>(
    request: Observable<T>,
    destination: (savedId: string) => string[],
    failureMessage: string,
    then?: (saved: T) => Observable<unknown>,
  ): void {
    request
      .pipe(
        // Before the follow-up rather than after it, so an editor left on the
        // page by a failed publish is still holding the work as the save left
        // it and can be saved again without a reload.
        tap(saved => this._host.onSaved?.(saved)),
        switchMap(saved =>
          then ? then(saved).pipe(map(() => saved)) : of(saved),
        ),
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
