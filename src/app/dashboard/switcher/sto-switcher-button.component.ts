import { Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';

import {
  StoSwitcherDialogComponent,
  StoSwitcherSelection,
} from './sto-switcher-dialog.component';

/**
 * The control that opens the quick switcher.
 *
 * A component rather than a button on each page: every page that offers the
 * switch would otherwise repeat the same dialog call, the same subscription and
 * the same route building, and they would drift. A page tells this where the
 * reader is standing and nothing else.
 */
@Component({
  selector: 'app-sto-switcher-button',
  templateUrl: './sto-switcher-button.component.html',
  styleUrls: ['./sto-switcher-button.component.scss'],
  standalone: true,
  // No `MatDialogModule` here on purpose. `MatDialog` is not provided in root,
  // but `AppComponent` imports the module, so every page already resolves one
  // from the root injector. Importing it again would put a second `MatDialog`
  // in this component's own injector and shadow the host page's — which on a
  // page that opens dialogs of its own means two dialog stacks that know
  // nothing about each other.
  imports: [],
})
export class StoSwitcherButtonComponent {
  /**
   * The account being viewed, so the switcher can mark it.
   *
   * On a captain's page this is the account the captain belongs to: the
   * switcher marks the captain as the current entry and leaves the account
   * above them reachable.
   */
  @Input() currentAccountId: string | null = null;

  /** The captain being viewed, so the switcher can mark them. */
  @Input() currentCharacterId: string | null = null;

  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Opens the switcher and follows whatever it closes with.
   */
  openSwitcher(): void {
    this._dialog
      .open(StoSwitcherDialogComponent, {
        data: {
          currentAccountId: this.currentAccountId,
          currentCharacterId: this.currentCharacterId,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((selection?: StoSwitcherSelection) => {
        if (selection) {
          void this._router.navigate(this.linkFor(selection));
        }
      });
  }

  /**
   * Builds the route for a chosen account or captain.
   *
   * Only the account handle is encoded. An account handle can carry the `#` of
   * its four-digit suffix, which has to leave the address; a captain's name
   * cannot.
   *
   * @param selection - What the switcher closed with.
   * @returns The router link to the chosen entry's detail page.
   */
  private linkFor(selection: StoSwitcherSelection): string[] {
    const accountLink = [
      `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`,
      encodeStoHandle(selection.accountHandle),
    ];

    return selection.characterHandle
      ? [...accountLink, selection.characterHandle]
      : accountLink;
  }
}
