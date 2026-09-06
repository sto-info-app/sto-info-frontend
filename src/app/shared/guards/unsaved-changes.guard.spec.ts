import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import {
  HasUnsavedChanges,
  confirmDiscard,
  unsavedChangesGuard,
} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let open: jest.Mock;

  const run = (
    hasUnsavedChanges: boolean,
  ): boolean | Observable<boolean> | UrlTree =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        { hasUnsavedChanges: () => hasUnsavedChanges } as HasUnsavedChanges,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

  beforeEach(() => {
    open = jest.fn().mockReturnValue({ afterClosed: () => of(true) });

    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: { open } }],
    });
  });

  // Nothing to lose, nothing to ask about. A confirmation on every navigation
  // would train people to dismiss the one that matters.
  it('leaves without a word when there is nothing unsaved', () => {
    expect(run(false)).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('asks before throwing unsaved work away', async () => {
    const answer = run(true) as Observable<boolean>;

    await expect(firstValueFrom(answer)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(ConfirmDialogComponent, {
      data: expect.objectContaining({ confirmText: 'Discard changes' }),
    });
  });

  // A dialog dismissed with the escape key closes with nothing rather than
  // with false, and "nothing" must not read as permission to discard.
  it('stays put when the dialog is dismissed', async () => {
    open.mockReturnValue({ afterClosed: () => of(undefined) });

    const answer = run(true) as Observable<boolean>;

    await expect(firstValueFrom(answer)).resolves.toBe(false);
  });

  it('words the question the same wherever it is asked from', async () => {
    const dialog = TestBed.inject(MatDialog);

    await expect(firstValueFrom(confirmDiscard(dialog))).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(ConfirmDialogComponent, {
      data: expect.objectContaining({ title: 'Unsaved changes' }),
    });
  });
});
