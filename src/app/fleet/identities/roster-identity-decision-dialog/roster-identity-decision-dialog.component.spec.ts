import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  ROSTER_IDENTITY_REASON_MAX_LENGTH,
  RosterIdentityDecisionDialogComponent,
  RosterIdentityDecisionDialogData,
} from './roster-identity-decision-dialog.component';

describe('RosterIdentityDecisionDialogComponent', () => {
  let fixture: ComponentFixture<RosterIdentityDecisionDialogComponent>;
  let dialogRef: { close: jest.Mock };

  /**
   * Opens the dialog.
   *
   * @param reasonRequired - Whether it must be told why.
   */
  async function render(reasonRequired: boolean): Promise<void> {
    dialogRef = { close: jest.fn() };
    const data: RosterIdentityDecisionDialogData = {
      title: 'Undo this decision',
      message: '<p>Undoing opens this rename again.</p>',
      confirmText: 'Undo',
      reasonRequired,
    };

    await TestBed.configureTestingModule({
      imports: [RosterIdentityDecisionDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterIdentityDecisionDialogComponent);
    fixture.detectChanges();
  }

  /** What the dialog says. */
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  /**
   * Finds a button by what it says.
   *
   * @param label - The button's text.
   * @returns The button.
   */
  const button = (label: string): HTMLButtonElement =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(candidate =>
      candidate.textContent?.includes(label),
    ) as HTMLButtonElement;

  /**
   * Types a reason into the box, as a reviewer would.
   *
   * @param value - The reason.
   */
  function type(value: string): void {
    const box = (fixture.nativeElement as HTMLElement).querySelector(
      'textarea',
    ) as HTMLTextAreaElement;

    box.value = value;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  describe('where a reason is optional', () => {
    beforeEach(() => render(false));

    it('says what will happen, and that a reason is optional', () => {
      expect(text()).toContain('Undo this decision');
      expect(text()).toContain('Undoing opens this rename again.');
      expect(text()).toContain('Why (optional)');
    });

    it('goes ahead with no reason', () => {
      button('Undo').click();

      expect(dialogRef.close).toHaveBeenCalledWith({});
    });

    it('goes ahead with the reason, trimmed', () => {
      type('  Seen together in game  ');
      button('Undo').click();

      expect(dialogRef.close).toHaveBeenCalledWith({
        reason: 'Seen together in game',
      });
    });

    it('goes ahead with no reason where only spaces were typed', () => {
      type('   ');
      button('Undo').click();

      expect(dialogRef.close).toHaveBeenCalledWith({});
    });

    it('refuses a reason longer than the server keeps', () => {
      type('x'.repeat(ROSTER_IDENTITY_REASON_MAX_LENGTH + 1));
      button('Undo').click();
      fixture.detectChanges();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(text()).toContain(
        `Keep it to ${ROSTER_IDENTITY_REASON_MAX_LENGTH} characters.`,
      );
    });

    it('closes with nothing when cancelled', () => {
      button('Cancel').click();

      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('where a reason is required', () => {
    beforeEach(() => render(true));

    it('does not call it optional', () => {
      expect(text()).not.toContain('(optional)');
      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('textarea')
          ?.getAttribute('aria-required'),
      ).toBe('true');
    });

    it.each([[''], ['   ']])('refuses to go ahead on %p', (value: string) => {
      type(value);
      button('Undo').click();
      fixture.detectChanges();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(text()).toContain('Say why');
    });

    it('goes ahead once told why', () => {
      type('Two different people');
      button('Undo').click();

      expect(dialogRef.close).toHaveBeenCalledWith({
        reason: 'Two different people',
      });
    });
  });
});
