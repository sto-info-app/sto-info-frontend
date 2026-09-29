import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from './governance-reason-dialog.component';

describe('GovernanceReasonDialogComponent', () => {
  let close: jest.Mock;

  /**
   * Opens the dialog.
   *
   * @param overrides - What differs from a plain reason.
   * @returns Its element.
   */
  const show = (overrides: Partial<GovernanceReasonDialogData> = {}) => {
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [GovernanceReasonDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Suspend Kira Fleet',
            message: 'It stays readable.',
            label: 'Reason',
            confirmText: 'Suspend',
            max: 500,
            ...overrides,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(GovernanceReasonDialogComponent);

    fixture.autoDetectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Types a reason.
   *
   * @param element - The dialog.
   * @param value - What to type.
   */
  const type = (element: HTMLElement, value: string) => {
    const box = element.querySelector(
      '#governance-reason',
    ) as HTMLTextAreaElement;

    box.value = value;
    box.dispatchEvent(new Event('input'));
  };

  it('asks for a reason, and closes with it trimmed', () => {
    const element = show();
    const confirm = element.querySelector('button.red') as HTMLButtonElement;

    expect(element.textContent).toContain('Suspend Kira Fleet');
    expect(element.textContent).toContain('It stays readable.');
    expect(confirm.disabled).toBe(true);
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();

    type(element, '  Disputed  ');
    confirm.click();

    expect(close).toHaveBeenCalledWith('Disputed');
  });

  it('needs as many characters as it asks for', () => {
    const element = show({ label: 'Purpose', min: 10 });

    expect(element.textContent).toContain('10 to 500 characters');
    type(element, 'Too short');
    expect(
      (element.querySelector('button.red') as HTMLButtonElement).disabled,
    ).toBe(true);
    type(element, 'Checking it');
    expect(
      (element.querySelector('button.red') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('does nothing on cancel', () => {
    const element = show();

    (element.querySelector('button.green') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });
});
