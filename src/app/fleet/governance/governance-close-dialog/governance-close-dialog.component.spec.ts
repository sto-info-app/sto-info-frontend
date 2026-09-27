import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { GOVERNANCE_REASON_LIMIT } from 'src/app/fleet/governance/governance.constants';

import {
  GovernanceCloseDialogComponent,
  GovernanceCloseDialogData,
} from './governance-close-dialog.component';

describe('GovernanceCloseDialogComponent', () => {
  let fixture: ComponentFixture<GovernanceCloseDialogComponent>;
  let dialogRef: { close: jest.Mock };

  /**
   * Opens the dialog.
   *
   * @param overrides - Changes to what it asks about.
   */
  async function render(
    overrides: Partial<GovernanceCloseDialogData> = {},
  ): Promise<void> {
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GovernanceCloseDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            scopeNoun: 'Community',
            name: 'United Federation Alliance ',
            asSiteAdmin: false,
            ...overrides,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceCloseDialogComponent);
    fixture.detectChanges();
  }

  /** What the dialog says. */
  const text = (): string =>
    String((fixture.nativeElement as HTMLElement).textContent);

  /**
   * Presses a button by what it says.
   *
   * @param label - The button's text.
   */
  function press(label: string): void {
    (
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ).find(
        candidate => candidate.textContent?.trim() === label,
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  }

  /**
   * Types into a field, as the reader would.
   *
   * @param selector - The field.
   * @param value - What is typed.
   */
  function type(selector: string, value: string): void {
    const field = (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLInputElement;

    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('says it cannot be undone, and names what is closing', async () => {
    await render();

    expect(text()).toContain('Close this Community');
    expect(text()).toContain('cannot be undone');
    expect(text()).toContain('United Federation Alliance');
    expect(text()).not.toContain('site administrator');
  });

  it('tells a site administrator where the reason is kept', async () => {
    await render({ asSiteAdmin: true });

    expect(text()).toContain('as a site administrator');
  });

  it('closes with the reason once the name is typed back', async () => {
    await render();
    type('#governance-close-name', 'United Federation Alliance');
    type('#governance-close-reason', '  Merged into another Community.  ');
    press('Close it');

    expect(dialogRef.close).toHaveBeenCalledWith({
      reason: 'Merged into another Community.',
    });
  });

  it('refuses a name that does not match', async () => {
    await render();
    type('#governance-close-name', 'united federation alliance');
    type('#governance-close-reason', 'Merged.');
    press('Close it');

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(text()).toContain('That is not its name.');
  });

  it.each([[''], ['   ']])('refuses the reason %p', async (reason: string) => {
    await render();
    type('#governance-close-name', 'United Federation Alliance');
    type('#governance-close-reason', reason);
    press('Close it');

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(text()).toContain('Say why');
  });

  it('refuses a reason longer than the server keeps', async () => {
    await render();
    type('#governance-close-name', 'United Federation Alliance');
    type('#governance-close-reason', 'x'.repeat(GOVERNANCE_REASON_LIMIT + 1));
    press('Close it');

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(text()).toContain(
      `Keep it to ${GOVERNANCE_REASON_LIMIT} characters.`,
    );
  });

  it('closes with nothing when kept open', async () => {
    await render();
    press('Keep it open');

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
