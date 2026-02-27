import * as fc from 'fast-check';
import { FormControl, FormGroup } from '@angular/forms';
import { MustMatch } from '../../app/shared/_helpers/must-match.validator';

describe('MustMatch validator fuzz tests', () => {
  const numRuns = Number(process.env['FUZZ_NUM_RUNS']) || 100;
  const controlName = 'password';
  const matchingControlName = 'confirmPassword';

  function createFormGroup(
    controlValue: string,
    matchingValue: string,
  ): FormGroup {
    return new FormGroup({
      [controlName]: new FormControl(controlValue),
      [matchingControlName]: new FormControl(matchingValue),
    });
  }

  it('should not throw for arbitrary string pairs and set mustMatch error when values differ', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(() => {
          const formGroup = createFormGroup(a, b);
          MustMatch(controlName, matchingControlName)(formGroup);

          const matchingControl = formGroup.controls[matchingControlName];
          if (a === b) {
            expect(matchingControl.errors?.['mustMatch']).toBeFalsy();
          } else {
            expect(matchingControl.errors?.['mustMatch']).toBe(true);
          }
        }).not.toThrow();
      }),
      { numRuns },
    );
  });

  it('should clear mustMatch when values match (arbitrary strings)', () => {
    fc.assert(
      fc.property(fc.string(), same => {
        expect(() => {
          const formGroup = createFormGroup(same, same);
          formGroup.controls[matchingControlName].setErrors({
            mustMatch: true,
          });

          MustMatch(controlName, matchingControlName)(formGroup);

          expect(
            formGroup.controls[matchingControlName].errors?.['mustMatch'],
          ).toBeFalsy();
        }).not.toThrow();
      }),
      { numRuns },
    );
  });
});
