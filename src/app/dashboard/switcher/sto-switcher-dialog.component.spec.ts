import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Observable, Subject, of, throwError } from 'rxjs';

import { SwitcherAccount } from '../models/account-switcher.model';
import { StoAccountService } from '../services/sto-account.service';
import {
  StoSwitcherDialogComponent,
  StoSwitcherDialogData,
} from './sto-switcher-dialog.component';

describe('StoSwitcherDialogComponent', () => {
  let fixture: ComponentFixture<StoSwitcherDialogComponent>;
  let component: StoSwitcherDialogComponent;
  let dialogRef: { close: jest.Mock };

  const character = (
    handle: string,
    overrides: Partial<SwitcherAccount['characters'][number]> = {},
  ): SwitcherAccount['characters'][number] => ({
    id: `character-${handle}`,
    handle,
    profilePicture100: null,
    factionName: null,
    factionIconUrl: null,
    generalFactionName: null,
    pinnedAt: null,
    ...overrides,
  });

  const account = (
    handle: string,
    overrides: Partial<SwitcherAccount> = {},
  ): SwitcherAccount => ({
    id: `account-${handle}`,
    handle,
    platformName: null,
    launcherName: null,
    lifetimeSubscription: false,
    pinnedAt: null,
    characters: [],
    ...overrides,
  });

  /**
   * Builds the dialog over a given list and a given place in the dashboard.
   *
   * @param list - What the API answers with, or an error to answer with.
   * @param data - Where the dialog was opened from.
   */
  const render = async (
    list: Observable<SwitcherAccount[]>,
    data: Partial<StoSwitcherDialogData> = {},
  ): Promise<void> => {
    TestBed.resetTestingModule();
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [StoSwitcherDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            currentAccountId: null,
            currentCharacterId: null,
            ...data,
          },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: StoAccountService,
          useValue: {
            getSwitcherList: (): Observable<SwitcherAccount[]> => list,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StoSwitcherDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /** Types a term into the filter box, the way somebody using it would. */
  const typeFilter = (term: string): void => {
    const input = fixture.debugElement.query(By.css('#sto-switcher-filter'))
      .nativeElement as HTMLInputElement;
    input.value = term;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  describe('loading the list', () => {
    it('should show every account with its captains once loaded', async () => {
      await render(
        of([
          account('Steve#1234', {
            characters: [character('Kaelith'), character('Tuvok')],
          }),
          account('Alt#5678', { characters: [character('Seven')] }),
        ]),
      );

      expect(component.isLoading()).toBe(false);
      expect(component.visibleAccounts().map(a => a.handle)).toEqual([
        'Steve#1234',
        'Alt#5678',
      ]);
      expect(
        component.visibleAccounts()[0].characters.map(c => c.handle),
      ).toEqual(['Kaelith', 'Tuvok']);
    });

    it('should show a loading bar while the roster is still being read', async () => {
      const pending = new Subject<SwitcherAccount[]>();
      await render(pending);

      expect(component.isLoading()).toBe(true);
      expect(
        fixture.debugElement.query(By.css('app-loading-bar')),
      ).not.toBeNull();

      pending.next([account('Steve#1234')]);
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(fixture.debugElement.query(By.css('app-loading-bar'))).toBeNull();
    });

    it('should report a failed fetch rather than an empty roster', async () => {
      await render(throwError(() => new Error('down')));

      expect(component.isLoading()).toBe(false);
      expect(component.hasFailed()).toBe(true);
      expect(
        fixture.debugElement.query(By.css('app-lcars-error-message')),
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('#sto-switcher-filter')),
      ).toBeNull();
    });

    it('should point a user with no accounts at where they can add one', async () => {
      await render(of([]));

      expect(component.hasNoAccounts()).toBe(true);
      expect(
        fixture.debugElement.query(By.css('.sto-switcher__empty')).nativeElement
          .textContent,
      ).toContain('No accounts on record');
    });

    it('should say when an account has no captains rather than leaving a gap', async () => {
      await render(of([account('Empty')]));

      expect(
        fixture.debugElement.query(By.css('.sto-switcher__no-captains'))
          .nativeElement.textContent,
      ).toContain('No captains yet');
    });
  });

  describe('the rows it draws', () => {
    it('should carry the platform and launcher icons for an account', async () => {
      await render(
        of([
          account('Steve#1234', {
            platformName: 'Windows',
            launcherName: 'Steam',
            lifetimeSubscription: true,
          }),
        ]),
      );

      const vm = component.visibleAccounts()[0];
      expect(vm.platformIconClass).toBe('fab fa-windows');
      expect(vm.launcherIconClass).toBe('fab fa-steam');
      expect(vm.lifetimeSubscription).toBe(true);
      expect(
        fixture.debugElement.query(By.css('.lifetime-icon')),
      ).not.toBeNull();
    });

    it('should leave out icons an account has no platform or launcher for', async () => {
      await render(of([account('Steve#1234')]));

      const vm = component.visibleAccounts()[0];
      expect(vm.platformIconClass).toBeNull();
      expect(vm.launcherIconClass).toBeNull();
    });

    it('should colour a captain row by allegiance and show their faction icon', async () => {
      await render(
        of([
          account('Steve#1234', {
            characters: [
              character('Kaelith', {
                generalFactionName: 'Federation',
                factionName: 'TOS Starfleet',
                factionIconUrl: 'https://cdn.test/faction.png',
                profilePicture100: 'https://cdn.test/avatar.png',
              }),
            ],
          }),
        ]),
      );

      const captain = component.visibleAccounts()[0].characters[0];
      expect(captain.factionClass).toBe('federation');
      expect(captain.avatarUrl).toBe('https://cdn.test/avatar.png');
      expect(
        fixture.debugElement
          .query(By.css('.sto-switcher__faction-icon'))
          .nativeElement.getAttribute('src'),
      ).toBe('https://cdn.test/faction.png');
    });

    it('should count every captain on an account, not just the ones on screen', async () => {
      await render(
        of([
          account('Steve#1234', {
            characters: [character('Kaelith'), character('Tuvok')],
          }),
        ]),
      );

      typeFilter('Kae');

      const vm = component.visibleAccounts()[0];
      expect(vm.characters).toHaveLength(1);
      expect(vm.totalCharacterCount).toBe(2);
    });

    it('should mark a pinned account and a pinned captain', async () => {
      await render(
        of([
          account('Steve#1234', {
            pinnedAt: '2026-01-01T00:00:00.000Z',
            characters: [
              character('Kaelith', { pinnedAt: '2026-01-02T00:00:00.000Z' }),
              character('Tuvok'),
            ],
          }),
        ]),
      );

      const vm = component.visibleAccounts()[0];
      expect(vm.pinned).toBe(true);
      expect(vm.characters[0].pinned).toBe(true);
      expect(vm.characters[1].pinned).toBe(false);
    });
  });

  describe('marking where the reader is standing', () => {
    it('should mark the account being read and refuse to jump to it', async () => {
      await render(of([account('Steve#1234'), account('Alt#5678')]), {
        currentAccountId: 'account-Steve#1234',
      });

      const [current, other] = component.visibleAccounts();
      expect(current.isCurrent).toBe(true);
      expect(other.isCurrent).toBe(false);

      const bars = fixture.debugElement.queryAll(
        By.css('.sto-switcher__account-bar'),
      );
      expect(bars[0].nativeElement.disabled).toBe(true);
      expect(bars[0].nativeElement.getAttribute('aria-current')).toBe('page');
      expect(bars[1].nativeElement.disabled).toBe(false);
    });

    it('should mark the captain being read and refuse to jump to them', async () => {
      await render(
        of([
          account('Steve#1234', {
            characters: [character('Kaelith'), character('Tuvok')],
          }),
        ]),
        {
          currentAccountId: 'account-Steve#1234',
          currentCharacterId: 'character-Kaelith',
        },
      );

      const captains = fixture.debugElement.queryAll(
        By.css('.sto-switcher__captain'),
      );
      expect(captains[0].nativeElement.disabled).toBe(true);
      expect(captains[1].nativeElement.disabled).toBe(false);
    });

    // Going up from a captain to the account they are on is a switch like any
    // other, so the bar above them has to stay live.
    it('should leave the account above the current captain reachable', async () => {
      await render(
        of([account('Steve#1234', { characters: [character('Kaelith')] })]),
        {
          currentAccountId: 'account-Steve#1234',
          currentCharacterId: 'character-Kaelith',
        },
      );

      expect(component.visibleAccounts()[0].isCurrent).toBe(false);
      expect(
        fixture.debugElement.query(By.css('.sto-switcher__account-bar'))
          .nativeElement.disabled,
      ).toBe(false);
    });
  });

  describe('filtering', () => {
    const roster = (): Observable<SwitcherAccount[]> =>
      of([
        account('Steve#1234', {
          characters: [character('Kaelith'), character('Tuvok')],
        }),
        account('Alt#5678', { characters: [character('Seven')] }),
      ]);

    it('should keep every captain on an account whose own name matches', async () => {
      await render(roster());

      typeFilter('steve');

      expect(component.visibleAccounts()).toHaveLength(1);
      expect(
        component.visibleAccounts()[0].characters.map(c => c.handle),
      ).toEqual(['Kaelith', 'Tuvok']);
    });

    it('should keep only the captains that match when the account does not', async () => {
      await render(roster());

      typeFilter('tuv');

      expect(component.visibleAccounts()).toHaveLength(1);
      expect(
        component.visibleAccounts()[0].characters.map(c => c.handle),
      ).toEqual(['Tuvok']);
    });

    it('should match regardless of case', async () => {
      await render(roster());

      typeFilter('SEVEN');

      expect(component.visibleAccounts().map(a => a.handle)).toEqual([
        'Alt#5678',
      ]);
    });

    it('should restore the whole list when the filter is cleared', async () => {
      await render(roster());

      typeFilter('seven');
      typeFilter('   ');

      expect(component.visibleAccounts()).toHaveLength(2);
      expect(component.hasNoMatches()).toBe(false);
    });

    it('should say when nothing matched rather than showing an empty list', async () => {
      await render(roster());

      typeFilter('nobody');

      expect(component.hasNoMatches()).toBe(true);
      expect(component.visibleAccounts()).toEqual([]);
      expect(
        fixture.debugElement.query(By.css('.sto-switcher__empty')).nativeElement
          .textContent,
      ).toContain('Nothing matched');
    });
  });

  describe('choosing a row', () => {
    it('should close with the account when an account bar is activated', async () => {
      await render(of([account('Steve#1234')]));

      fixture.debugElement
        .query(By.css('.sto-switcher__account-bar'))
        .nativeElement.click();

      expect(dialogRef.close).toHaveBeenCalledWith({
        accountHandle: 'Steve#1234',
        characterHandle: null,
      });
    });

    it('should close with both handles when a captain row is activated', async () => {
      await render(
        of([account('Steve#1234', { characters: [character('Kaelith')] })]),
      );

      fixture.debugElement
        .query(By.css('.sto-switcher__captain'))
        .nativeElement.click();

      expect(dialogRef.close).toHaveBeenCalledWith({
        accountHandle: 'Steve#1234',
        characterHandle: 'Kaelith',
      });
    });

    it('should close with nothing when cancelled', async () => {
      await render(of([account('Steve#1234')]));

      component.cancel();

      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
