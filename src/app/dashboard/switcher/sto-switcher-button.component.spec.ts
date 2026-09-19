import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { StoSwitcherButtonComponent } from './sto-switcher-button.component';
import {
  StoSwitcherDialogComponent,
  StoSwitcherSelection,
} from './sto-switcher-dialog.component';

describe('StoSwitcherButtonComponent', () => {
  let fixture: ComponentFixture<StoSwitcherButtonComponent>;
  let component: StoSwitcherButtonComponent;
  let dialog: { open: jest.Mock };
  let router: { navigate: jest.Mock };

  /**
   * Builds the button over a switcher that closes with the given selection.
   *
   * @param selection - What the dialog closes with, or undefined for a cancel.
   */
  const render = async (selection?: StoSwitcherSelection): Promise<void> => {
    TestBed.resetTestingModule();
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(selection) }),
    };
    router = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [StoSwitcherButtonComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StoSwitcherButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /** Presses the button, the way somebody using it would. */
  const press = (): void => {
    fixture.debugElement.query(By.css('button.cta-icon')).nativeElement.click();
  };

  it('should render a labelled control so the icon is not the only cue', async () => {
    await render();

    const button = fixture.debugElement.query(By.css('button.cta-icon'))
      .nativeElement as HTMLButtonElement;

    expect(button.getAttribute('title')).toBe('Switch Account or Captain');
    expect(button.getAttribute('aria-label')).toBe('Switch account or captain');
  });

  it('should tell the switcher where the reader is standing', async () => {
    await render();
    component.currentAccountId = 'account-1';
    component.currentCharacterId = 'character-1';

    press();

    expect(dialog.open).toHaveBeenCalledWith(StoSwitcherDialogComponent, {
      data: {
        currentAccountId: 'account-1',
        currentCharacterId: 'character-1',
      },
    });
  });

  it('should report no current entry when the page has not named one', async () => {
    await render();

    press();

    expect(dialog.open).toHaveBeenCalledWith(StoSwitcherDialogComponent, {
      data: { currentAccountId: null, currentCharacterId: null },
    });
  });

  it('should open the account detail page when an account was chosen', async () => {
    await render({ accountHandle: 'Steve#1234', characterHandle: null });

    press();

    expect(router.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Steve~1234',
    ]);
  });

  // The account handle's four-digit suffix has to leave the address; a
  // captain's name has no suffix and goes through as it stands.
  it('should encode the account handle but not the captain name', async () => {
    await render({ accountHandle: 'Steve#1234', characterHandle: 'Kaelith' });

    press();

    expect(router.navigate).toHaveBeenCalledWith([
      '/dashboard/accounts',
      'Steve~1234',
      'Kaelith',
    ]);
  });

  it('should stay where it is when the switcher was cancelled', async () => {
    await render(undefined);

    press();

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
