import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  RosterChangeKind,
  RosterEpisodeEnd,
  RosterEpisodeStart,
  RosterRankMove,
  RosterTimeline,
} from 'src/app/models/fleet-roster.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  ROSTER_TIMELINE_MISSING,
  ROSTER_TIMELINE_NOT_PERMITTED,
  RosterTimelineComponent,
} from './roster-timeline.component';

const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';
const OCT_27 = '2024-10-27T01:30:00.000Z';
const NOV_1 = '2024-11-01T12:00:00.000Z';
const NOV_15 = '2024-11-15T12:00:00.000Z';

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param capabilities - What the reader holds.
 * @returns The resolved Fleet.
 */
function resolved(capabilities: string[] = ['roster.view']): ResolvedStoFleet {
  return {
    fleet: {
      id: 'fleet-1',
      slug: 'ninth-fleet',
      exactGameName: 'Ninth Fleet',
      communityId: 'community-1',
      platformProvidesRosterExport: true,
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: { capabilities },
  } as unknown as ResolvedStoFleet;
}

/**
 * Builds a member's timeline.
 *
 * @param overrides - Fields to change.
 * @returns The timeline.
 */
function timeline(overrides: Partial<RosterTimeline> = {}): RosterTimeline {
  return {
    revision: 17,
    publishedAt: '2026-09-25T00:30:00.000Z',
    stale: false,
    identityId: 'identity-kell',
    member: { characterName: 'Kell Marr', accountHandle: '@fixture003' },
    profile: null,
    episodes: [
      {
        ordinal: 1,
        startKind: RosterEpisodeStart.JOINED,
        startedAfter: {
          importId: 'import-0',
          exportedAt: '2024-01-01T12:00:00.000Z',
        },
        first: { importId: 'import-1', exportedAt: OCT_27 },
        reportedJoinedAt: '2022-01-09T18:20:00.000Z',
        reportedJoinedAtAmbiguous: false,
        last: { importId: 'import-3', exportedAt: NOV_15 },
        endKind: null,
        endedBefore: null,
        endedBeforeImportId: null,
        baselineContribution: '4412077',
        lastObservedContribution: '4414000',
      },
    ],
    changes: [
      {
        identityId: 'identity-kell',
        kind: RosterChangeKind.RANK_CHANGED,
        from: { importId: 'import-1', exportedAt: OCT_27 },
        to: { importId: 'import-2', exportedAt: NOV_1 },
        acrossGap: false,
        member: null,
        rankMove: RosterRankMove.DEMOTED,
        fromRank: 'Officer',
        toRank: 'Member',
      },
      {
        identityId: 'identity-kell',
        kind: RosterChangeKind.CONTRIBUTION_CHANGED,
        from: { importId: 'import-2', exportedAt: NOV_1 },
        to: { importId: 'import-3', exportedAt: NOV_15 },
        acrossGap: true,
        member: null,
        rankMove: null,
        contributionDelta: '1000',
        fromContribution: '4413000',
        toContribution: '4414000',
      },
    ],
    rows: [
      {
        importId: 'import-1',
        exportedAt: OCT_27,
        partial: false,
        line: 2,
        characterName: 'Kell Marr',
        accountHandle: '@fixture003',
        level: 65,
        guildRank: 'Officer',
        rankTier: 1,
        contributionTotal: '4412077',
        lastActiveAt: '2024-10-25T21:00:00.000Z',
        lastActiveAtAmbiguous: false,
        excluded: false,
      },
      {
        importId: 'import-3',
        exportedAt: NOV_15,
        partial: true,
        line: 2,
        characterName: 'Kell Marr',
        accountHandle: '@fixture003',
        level: 65,
        guildRank: 'Member',
        rankTier: null,
        contributionTotal: '4414000',
        lastActiveAt: null,
        lastActiveAtAmbiguous: false,
        excluded: true,
      },
    ],
    ...overrides,
  };
}

describe('RosterTimelineComponent', () => {
  let fixture: ComponentFixture<RosterTimelineComponent>;
  let scopes: { resolveFleet: jest.Mock };
  let roster: { timeline: jest.Mock };

  beforeEach(async () => {
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    roster = { timeline: jest.fn(() => of(timeline())) };

    await TestBed.configureTestingModule({
      imports: [RosterTimelineComponent],
      providers: [
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterService, useValue: roster },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(
              convertToParamMap({
                communitySlug: 'united-federation-alliance',
                platformSegment: 'pc',
                slug: 'ninth-fleet',
                identityId: 'identity-kell',
              }),
            ),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(RosterTimelineComponent);
    fixture.detectChanges();
  }

  /** The page as drawn. */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** What the page says, its whitespace folded. */
  const text = (): string => (page().textContent ?? '').replace(/\s+/g, ' ');

  it('asks for the member the address names', () => {
    render();

    expect(roster.timeline).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'identity-kell',
    );
  });

  it('names the member as last listed, and links back to the history', () => {
    render();

    expect(
      page().querySelector('.roster-timeline__member strong')?.textContent,
    ).toBe('Kell Marr@fixture003');

    const links = Array.from(
      page().querySelectorAll('.roster-timeline__member a'),
    ).map(link => [link.textContent?.trim(), link.getAttribute('href')]);

    expect(links).toEqual([['Back to the history', `${FLEET_HREF}/history`]]);
  });

  it('links to the member’s registry page where the rule allows', () => {
    roster.timeline.mockReturnValue(
      of(
        timeline({
          profile: {
            username: 'kell',
            accountSlug: 'fixture003',
            characterSlug: 'kell-marr@fixture003',
          },
        }),
      ),
    );
    render();

    expect(
      page().querySelector('.roster-timeline__link')?.getAttribute('href'),
    ).toBe('/community/registry/profiles/kell/fixture003/kell-marr@fixture003');
  });

  it('calls a member none of whose rows the reader may see this member', () => {
    roster.timeline.mockReturnValue(of(timeline({ member: null, rows: [] })));
    render();

    expect(text()).toContain('This member');
    // One export is not a line to draw.
    expect(page().querySelector('app-smart-chart')).toBeNull();
  });

  it('bounds each stretch of membership by the exports either side', () => {
    render();

    const cells = Array.from(
      page().querySelectorAll('table')[0].querySelectorAll('tbody td'),
    ).map(cell => cell.textContent?.replace(/\s+/g, ' ').trim());

    expect(cells).toEqual([
      'Joined after Jan 1, 2024, 12:00:00 PM',
      'Oct 27, 2024, 1:30:00 AM',
      'Nov 15, 2024, 12:00:00 PM',
      'Still listed',
      'Jan 9, 2022',
    ]);
  });

  it.each([
    [RosterEpisodeEnd.LEFT, 'Left'],
    [RosterEpisodeEnd.LEFT_AND_REJOINED, 'Left, and came back'],
  ])('says an episode that ended %s by when', (endKind, words) => {
    roster.timeline.mockReturnValue(
      of(
        timeline({
          episodes: [
            {
              ...timeline().episodes[0],
              startKind: RosterEpisodeStart.FIRST_SEEN,
              startedAfter: null,
              endKind,
              endedBefore: NOV_15,
            },
          ],
        }),
      ),
    );
    render();

    const cells = Array.from(
      page().querySelectorAll('table')[0].querySelectorAll('tbody td'),
    ).map(cell => cell.textContent?.replace(/\s+/g, ' ').trim());

    expect(cells[0]).toBe('Already listed');
    expect(cells[3]).toBe(`${words} by Nov 15, 2024, 12:00:00 PM`);
  });

  it('draws the contribution total at each export', () => {
    render();

    const chart = fixture.debugElement.query(
      element => element.name === 'app-smart-chart',
    );

    expect(chart.componentInstance.data()).toEqual([
      { name: 'Oct 27, 2024', count: 4412077 },
      { name: 'Nov 15, 2024', count: 4414000 },
    ]);
  });

  it('lists every change between its bounds, oldest first', () => {
    render();

    const items = Array.from(
      page().querySelectorAll('.roster-timeline__changes li'),
    ).map(item => item.textContent?.replace(/\s+/g, ' ').trim());

    expect(items).toEqual([
      'Between Oct 27, 2024, 1:30:00 AM and Nov 1, 2024, 12:00:00 PM: was demoted from Officer to Member',
      'Between Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM: contributed 1,000 (4,413,000 to 4,414,000) across a gap, so in no interval’s totals',
    ]);
  });

  it('says by when a change no export bounds below happened', () => {
    roster.timeline.mockReturnValue(
      of(
        timeline({
          changes: [
            {
              ...timeline().changes[0],
              kind: RosterChangeKind.JOIN_DATE_CHANGED,
              from: null,
              fromJoinedAt: '2022-01-09T18:20:00.000Z',
              toJoinedAt: '2022-01-10T18:20:00.000Z',
            },
          ],
        }),
      ),
    );
    render();

    expect(text()).toContain(
      'By Nov 1, 2024, 12:00:00 PM: had their Join Date change from Jan 9, 2022 to Jan 10, 2022',
    );
  });

  it('says when nothing about them has changed', () => {
    roster.timeline.mockReturnValue(of(timeline({ changes: [] })));
    render();

    expect(text()).toContain('Nothing about them has changed');
  });

  it('gives their row on each export, a partial export and an exclusion said', () => {
    render();

    const rows = Array.from(
      page().querySelectorAll('table')[1].querySelectorAll('tbody tr'),
    ).map(row =>
      Array.from(row.querySelectorAll('td')).map(cell =>
        cell.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    );

    expect(rows).toEqual([
      [
        'Oct 27, 2024, 1:30:00 AM',
        'Kell Marr@fixture003',
        'Officer tier 1',
        '65',
        '4,412,077',
        'Oct 25, 2024',
      ],
      [
        expect.stringContaining(
          'Nov 15, 2024, 12:00:00 PM',
        ) as unknown as string,
        'Kell Marr@fixture003',
        'Member',
        '65',
        '4,414,000',
        '',
      ],
    ]);

    const notes = Array.from(
      page()
        .querySelectorAll('table')[1]
        .querySelectorAll('tbody tr')[1]
        .querySelectorAll('td')[0]
        .querySelectorAll('.roster-timeline__note'),
    ).map(note => note.textContent?.trim());

    expect(notes).toEqual(['partial', 'row excluded by an investigator']);
  });

  it('says a newer history is on its way', () => {
    roster.timeline.mockReturnValue(of(timeline({ stale: true })));
    render();

    expect(text()).toContain('A change is being worked into the history.');
  });

  it('says a member the Fleet does not have is missing, in so many words', () => {
    roster.timeline.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render();

    expect(text()).toContain(ROSTER_TIMELINE_MISSING);
  });

  it('tells a reader who is not a member so, without asking', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved([])));
    render();

    expect(text()).toContain(ROSTER_TIMELINE_NOT_PERMITTED);
    expect(roster.timeline).not.toHaveBeenCalled();
  });
});
