import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Observable, of, throwError } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import {
  FleetDirectoryStatusFilter,
  FleetRecruitmentState,
  FleetScopeStatus,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  STANDALONE_CONFIRM_FAILED,
  StandaloneRegisterComponent,
} from './standalone-register.component';

/**
 * Builds a directory card the preflight search might find.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function card(overrides: Partial<StoFleetCard> = {}): StoFleetCard {
  return {
    id: 'fleet-9',
    slug: 'starfleet-command',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    exactGameName: 'Starfleet Command',
    communityId: null,
    communityName: null,
    communitySlug: null,
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    duplicateCount: 0,
    recruitmentState: FleetRecruitmentState.OPEN,
    allegianceFactionId: null,
    lastEffectiveImportAt: null,
    ...overrides,
  };
}

describe('StandaloneRegisterComponent', () => {
  let fixture: ComponentFixture<StandaloneRegisterComponent>;
  let registration: { confirmStandaloneFleet: jest.Mock };
  let directory: { listFleets: jest.Mock };
  let router: { navigate: jest.Mock };
  let formatted: string | null;

  beforeEach(async () => {
    registration = {
      confirmStandaloneFleet: jest.fn(() =>
        of({
          fleet: { slug: 'starfleet-command', platformSegment: 'pc' },
          duplicates: [],
        }),
      ),
    };
    directory = {
      listFleets: jest.fn(() =>
        of({ items: [], total: 0, page: 1, pageSize: 10 }),
      ),
    };
    router = { navigate: jest.fn() };
    formatted = '4 March 2015';

    await TestBed.configureTestingModule({
      imports: [StandaloneRegisterComponent],
      providers: [
        { provide: FleetRegistrationService, useValue: registration },
        { provide: FleetDirectoryService, useValue: directory },
        {
          provide: StoAccountService,
          useValue: {
            getPlatforms: (): Observable<{ id: string; name: string }[]> =>
              of([{ id: 'platform-1', name: 'PC' }]),
          },
        },
        { provide: Router, useValue: router },
      ],
    })
      .overrideComponent(StandaloneRegisterComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string | null => formatted },
            },
          ],
        },
      })
      .compileComponents();
  });

  /**
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(StandaloneRegisterComponent);
    fixture.detectChanges();
  }

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = <T extends HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null;

  /**
   * Types into a control.
   *
   * @param selector - The control's CSS selector.
   * @param value - What to type.
   */
  function type(selector: string, value: string): void {
    const control = find<HTMLInputElement>(selector) as HTMLInputElement;

    control.value = value;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /**
   * Fills the name and the platform in.
   */
  function fillRequired(): void {
    type('#standalone-name', 'Starfleet Command ');

    const platform = find<HTMLSelectElement>(
      '#standalone-platform',
    ) as HTMLSelectElement;

    platform.value = 'platform-1';
    platform.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /**
   * Ticks the confirmation box.
   */
  function confirm(): void {
    const box = find<HTMLInputElement>(
      '#standalone-confirm',
    ) as HTMLInputElement;

    box.click();
    fixture.detectChanges();
  }

  /**
   * Submits the form.
   */
  function submit(): void {
    (find<HTMLFormElement>('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
  }

  /** The body of the last confirmation sent. */
  const sent = (): Record<string, unknown> =>
    registration.confirmStandaloneFleet.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;

  // The two things that make this record different are the two a reader
  // would otherwise assume the opposite of.
  it('says plainly that nobody will be able to change or close it', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'able to change it or close it afterwards',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'two confirmations of one name make two records',
    );
  });

  it('points somebody registering their own Fleet elsewhere', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'register a Community first',
    );
  });

  describe('the confirmation box', () => {
    // Not a checkbox for its own sake: creating one of these is almost
    // always a mistake by somebody who meant to register their own Fleet.
    it('refuses to send anything until it is ticked', () => {
      render();

      fillRequired();
      submit();

      expect(registration.confirmStandaloneFleet).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain(
        'Please confirm that you understand',
      );
    });

    it('sends the flag the server refuses a request without', () => {
      render();

      fillRequired();
      confirm();
      submit();

      expect(sent()['confirmUnregistered']).toBe(true);
    });
  });

  describe('checking what already exists', () => {
    it('asks nothing until there is a name and a platform', () => {
      render();

      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(directory.listFleets).not.toHaveBeenCalled();
    });

    // A closed record still holds the name, and somebody about to confirm
    // a second one wants to know it exists.
    it('searches the public directory, closed records included', () => {
      render();

      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(directory.listFleets).toHaveBeenCalledWith({
        search: 'Starfleet Command ',
        platformId: 'platform-1',
        status: FleetDirectoryStatusFilter.ANY,
        pageSize: 10,
      });
    });

    it('says whose each match is and how current it is', () => {
      directory.listFleets.mockReturnValue(
        of({
          items: [
            card({
              communityName: 'Ninth Fleet',
              lastEffectiveImportAt: '2015-03-04T00:00:00Z',
            }),
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Ninth Fleet · PC');
      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 4 March 2015',
      );
    });

    // The instant as the server wrote it is ugly and true; nothing at all
    // would hide the one fact the comparison turns on.
    it('falls back to the raw instant when it cannot be written out', () => {
      formatted = null;
      directory.listFleets.mockReturnValue(
        of({
          items: [card({ lastEffectiveImportAt: '2015-03-04T00:00:00Z' })],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 2015-03-04T00:00:00Z',
      );
    });

    it('names a match that belongs to no Community for what it is', () => {
      directory.listFleets.mockReturnValue(
        of({ items: [card()], total: 1, page: 1, pageSize: 10 }),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'No Community — a standalone record',
      );
      expect(fixture.nativeElement.textContent).toContain(
        'No roster has ever been imported',
      );
    });

    it('says when a match is closed', () => {
      directory.listFleets.mockReturnValue(
        of({
          items: [card({ status: FleetScopeStatus.CLOSED })],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      );

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'This record is closed',
      );
    });

    it('reports a search it could not run as no warning', () => {
      directory.listFleets.mockReturnValue(throwError(() => new Error('x')));

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Nothing else answers to that name',
      );
    });

    it('asks once while an answer is still coming', () => {
      directory.listFleets.mockReturnValue(new Observable());

      render();
      fillRequired();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();
      find<HTMLButtonElement>('.lcars-btn.gold')?.click();

      expect(directory.listFleets).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirming', () => {
    it('sends the name untrimmed, spaces and all', () => {
      render();

      fillRequired();
      confirm();
      submit();

      expect(sent()['exactGameName']).toBe('Starfleet Command ');
      expect(sent()['platformId']).toBe('platform-1');
    });

    // It has a page now, under the reserved segment where a Community's
    // slug would sit.
    it('opens the record it just confirmed', () => {
      render();

      fillRequired();
      confirm();
      submit();

      expect(router.navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'standalone',
        'fleets',
        'pc',
        'starfleet-command',
      ]);
    });

    it('cannot be sent twice while the first is in flight', () => {
      registration.confirmStandaloneFleet.mockReturnValue(new Observable());

      render();
      fillRequired();
      confirm();
      submit();
      submit();

      expect(registration.confirmStandaloneFleet).toHaveBeenCalledTimes(1);
    });

    it('says something a reader can act on when it fails', () => {
      registration.confirmStandaloneFleet.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      render();
      fillRequired();
      confirm();
      submit();

      expect(fixture.nativeElement.textContent).toContain(
        STANDALONE_CONFIRM_FAILED,
      );
    });
  });
});
