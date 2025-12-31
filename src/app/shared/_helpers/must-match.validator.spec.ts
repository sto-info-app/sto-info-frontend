import { FormControl, FormGroup } from '@angular/forms';
import { MustMatch } from './must-match.validator';

function createFormGroup(
  controlValue: unknown,
  matchingValue: unknown,
): FormGroup<{
  password: FormControl<unknown>;
  confirmPassword: FormControl<unknown>;
}> {
  return new FormGroup({
    password: new FormControl(controlValue),
    confirmPassword: new FormControl(matchingValue),
  });
}

describe('must-match.validator', () => {
  const controlName = 'password';
  const matchingControlName = 'confirmPassword';

  it('should export MustMatch', () => {
    expect(MustMatch).toBeDefined();
  });

  it('should set mustMatch error when values do not match', () => {
    const formGroup = createFormGroup('a', 'b');

    MustMatch(controlName, matchingControlName)(formGroup);

    expect(formGroup.controls.confirmPassword.errors).toEqual({
      mustMatch: true,
    });
  });

  it('should clear mustMatch error (set to null) when values match and there are no existing errors', () => {
    const formGroup = createFormGroup('same', 'same');

    // Ensure starting state has no errors
    expect(formGroup.controls.confirmPassword.errors).toBeNull();

    MustMatch(controlName, matchingControlName)(formGroup);

    expect(formGroup.controls.confirmPassword.errors).toBeNull();
  });

  it('should return early and not override non-mustMatch errors on matching control', () => {
    const formGroup = createFormGroup('a', 'b');
    formGroup.controls.confirmPassword.setErrors({ required: true });

    MustMatch(controlName, matchingControlName)(formGroup);

    // Because existing errors exist and do not include mustMatch, validator must not change them
    expect(formGroup.controls.confirmPassword.errors).toEqual({
      required: true,
    });
  });

  it('should remove only mustMatch from existing errors when values match and other errors remain', () => {
    const formGroup = createFormGroup('same', 'same');
    formGroup.controls.confirmPassword.setErrors({
      mustMatch: true,
      minlength: true,
    });

    MustMatch(controlName, matchingControlName)(formGroup);

    expect(formGroup.controls.confirmPassword.errors).toEqual({
      minlength: true,
    });
  });

  it('should clear errors when values match and existing errors are only mustMatch', () => {
    const formGroup = createFormGroup('same', 'same');
    formGroup.controls.confirmPassword.setErrors({ mustMatch: true });

    MustMatch(controlName, matchingControlName)(formGroup);

    expect(formGroup.controls.confirmPassword.errors).toBeNull();
  });
});
