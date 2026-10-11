import { FormBuilder } from '@angular/forms';

import {
  createAccountForm,
  requireLauncherWhenOffered,
} from './account-form.factory';

describe('createAccountForm', () => {
  it('should ask for a well-formed handle and nothing else', () => {
    const form = createAccountForm(new FormBuilder());

    expect(form.valid).toBe(false);

    form.patchValue({ handle: 'Captain#1234' });
    expect(form.valid).toBe(true);

    form.patchValue({ handle: 'no hash' });
    expect(form.get('handle')?.hasError('pattern')).toBe(true);
  });
});

describe('requireLauncherWhenOffered', () => {
  it('should require a launcher while the platform offers one', () => {
    const form = createAccountForm(new FormBuilder());
    form.patchValue({ handle: 'Captain#1234', platformId: 'p1' });

    requireLauncherWhenOffered(form, 2);
    expect(form.get('launcherId')?.hasError('required')).toBe(true);
    expect(form.valid).toBe(false);

    form.patchValue({ launcherId: 'l1' });
    expect(form.valid).toBe(true);
  });

  it('should drop the requirement once no launcher is offered', () => {
    const form = createAccountForm(new FormBuilder());
    form.patchValue({ handle: 'Captain#1234', platformId: 'p1' });
    requireLauncherWhenOffered(form, 1);
    expect(form.valid).toBe(false);

    requireLauncherWhenOffered(form, 0);
    expect(form.get('launcherId')?.hasError('required')).toBe(false);
    expect(form.valid).toBe(true);
  });

  it('should not stack the validator when applied twice', () => {
    const form = createAccountForm(new FormBuilder());
    form.patchValue({ handle: 'Captain#1234', platformId: 'p1' });
    requireLauncherWhenOffered(form, 1);
    requireLauncherWhenOffered(form, 1);

    requireLauncherWhenOffered(form, 0);
    expect(form.valid).toBe(true);
  });
});
