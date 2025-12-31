import { FormGroup } from '@angular/forms';

export function MustMatch(controlName: string, matchingControlName: string) {
  return (formGroup: FormGroup) => {
    const control = formGroup.controls[controlName];
    const matchingControl = formGroup.controls[matchingControlName];

    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      return;
    }

    if (control.value === matchingControl.value) {
      if (matchingControl.errors) {
        const { ...remainingErrors } = matchingControl.errors;
        delete remainingErrors['mustMatch'];
        matchingControl.setErrors(
          Object.keys(remainingErrors).length ? remainingErrors : null,
        );
      } else {
        matchingControl.setErrors(null);
      }
      return;
    }

    matchingControl.setErrors({ mustMatch: true });
  };
}
