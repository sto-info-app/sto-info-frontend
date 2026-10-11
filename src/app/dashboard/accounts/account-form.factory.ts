import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { STO_HANDLE_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';

/**
 * Builds the form behind an STO account, wherever it is edited.
 *
 * The dialog and the full page edit the same account, so they ask for the same
 * fields under the same rules — the handle is the only thing the game itself
 * insists on, and it is checked here so a typo is caught before a round trip.
 *
 * @param formBuilder - The form builder to use.
 * @returns The form.
 */
export function createAccountForm(formBuilder: FormBuilder): FormGroup {
  return formBuilder.group({
    handle: ['', [Validators.required, Validators.pattern(STO_HANDLE_PATTERN)]],
    username: [''],
    email: ['', [Validators.email]],
    notes: [''],
    accountCreatedDate: [null],
    publiclyVisible: [true],
    lifetimeSubscription: [false],
    platformId: [''],
    launcherId: [''],
  });
}

/**
 * Asks for a launcher once the chosen platform offers one.
 *
 * The backend drops an empty launcher instead of storing it, so a form that
 * let the member leave the launcher blank saved nothing on a create and kept
 * the old launcher on an edit. When the platform offers launchers, one has to
 * be picked; a platform without any leaves the field alone.
 *
 * @param form - The account form.
 * @param offered - How many launchers the chosen platform offers.
 */
export function requireLauncherWhenOffered(
  form: FormGroup,
  offered: number,
): void {
  const launcher = form.controls['launcherId'];

  if (offered > 0) {
    launcher.addValidators(Validators.required);
  } else {
    launcher.removeValidators(Validators.required);
  }

  launcher.updateValueAndValidity({ emitEvent: false });
}
