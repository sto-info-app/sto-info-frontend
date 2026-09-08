import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StorytimeVisibility } from 'src/app/models/storytime.models';

/**
 * Builds the form behind a Story or an Arc.
 *
 * The two describe themselves with the same fields, in the same order and to
 * the same limits, because they are shown to a reader in the same places. The
 * lengths match what the server accepts, so an over-long title is refused
 * while it can still be corrected rather than after a round trip.
 *
 * @param formBuilder - The form builder to use.
 * @param extraControls - Controls that only one of the two has, in their place.
 * @returns The form.
 */
export function createWorkForm(
  formBuilder: FormBuilder,
  extraControls: Record<string, unknown[]> = {},
): FormGroup {
  return formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', Validators.maxLength(220)],
    shortDescription: ['', Validators.maxLength(500)],
    description: [''],
    ...extraControls,
    visibility: [StorytimeVisibility.PRIVATE],
    languageCode: ['en-GB'],
  });
}
