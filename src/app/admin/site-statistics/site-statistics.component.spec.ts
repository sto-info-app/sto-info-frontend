import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CountWindows,
  SiteStatistics,
} from 'src/app/models/site-statistics.models';

import { SiteStatisticsAdminService } from './site-statistics-admin.service';
import {
  SiteStatisticsComponent,
  weekLabel,
} from './site-statistics.component';

/**
 * A count over the four windows.
 *
 * @param allTime - Ever; the bounded windows count down from it.
 * @returns The windows.
 */
function windows(allTime: number): CountWindows {
  return {
    today: Math.max(0, allTime - 3),
    last7Days: Math.max(0, allTime - 2),
    last30Days: Math.max(0, allTime - 1),
    allTime,
  };
}

const STATISTICS: SiteStatistics = {
  generatedAt: '2026-10-22T15:30:00.000Z',
  users: {
    total: 412,
    verified: 380,
    disabled: 3,
    closed: 12,
    byRole: [
      { role: 'USER', count: 400 },
      { role: 'ADMIN', count: 2 },
      { role: 'STORYTIME_CURATOR', count: 10 },
    ],
    registrations: windows(424),
    active: windows(90),
  },
  registrationsByWeek: [
    { weekStarting: '2026-10-12', count: 4 },
    { weekStarting: '2026-10-19', count: 7 },
  ],
  lastSeenByWeek: [
    { weekStarting: '2026-10-12', count: 20 },
    { weekStarting: '2026-10-19', count: 61 },
  ],
  storytime: {
    storiesPublished: windows(30),
    chaptersPublished: windows(120),
    arcsPublished: windows(5),
    spotlightsLive: 4,
    comments: windows(200),
  },
  fleet: {
    communities: { active: 14, registered: windows(15) },
    fleets: { active: 20, registered: windows(21) },
    armadas: { active: 2, registered: windows(2) },
    members: 120,
    chatMessages: windows(5000),
    applications: windows(40),
    events: windows(60),
  },
  content: {
    stoAccounts: windows(500),
    stoCharacters: windows(1500),
    newsPublished: windows(25),
    openReports: { members: 2, chat: 1, total: 3 },
  },
};

describe('SiteStatisticsComponent (FC-053)', () => {
  let fixture: ComponentFixture<SiteStatisticsComponent>;
  let component: SiteStatisticsComponent;
  let service: { read: jest.Mock };

  /**
   * The page as rendered.
   *
   * @returns Its element.
   */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    service = { read: jest.fn(() => of(STATISTICS)) };

    await TestBed.configureTestingModule({
      imports: [SiteStatisticsComponent],
      providers: [
        provideRouter([]),
        { provide: SiteStatisticsAdminService, useValue: service },
        { provide: AuthService, useValue: { getUserId: () => 'admin-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteStatisticsComponent);
    component = fixture.componentInstance;
  });

  it('reads the numbers once, and stops loading', () => {
    fixture.detectChanges();

    expect(service.read).toHaveBeenCalledTimes(1);
    expect(component.isLoading()).toBe(false);
    expect(component.statistics()).toBe(STATISTICS);
    expect(page().querySelector('app-loading-bar')).toBeNull();
  });

  it('says when the numbers were read', () => {
    fixture.detectChanges();

    expect(
      page().querySelector('.site-statistics__as-of')?.textContent,
    ).toMatch(/As of .*2026/);
  });

  it('leads with members, the active, the newly joined and the open reports', () => {
    fixture.detectChanges();

    const tiles = Array.from(
      page().querySelectorAll('.site-statistics__hero app-stat-info-card'),
    ).map(tile => [
      tile.querySelector('.card-label')?.textContent?.trim(),
      tile.querySelector('.card-value')?.textContent?.trim(),
    ]);

    expect(tiles).toEqual([
      ['Members', '412'],
      ['Active in 30 days', '89'],
      ['Joined in 30 days', '423'],
      ['Open reports', '3'],
    ]);
  });

  // The series are drawn as given: oldest week first, every week a bar.
  it('charts sign-ups and last-seen by week, oldest first', () => {
    fixture.detectChanges();

    expect(component.registrationsByWeek()).toEqual([
      { name: 'w/c 12 Oct', count: 4 },
      { name: 'w/c 19 Oct', count: 7 },
    ]);
    expect(component.lastSeenByWeek()).toEqual([
      { name: 'w/c 12 Oct', count: 20 },
      { name: 'w/c 19 Oct', count: 61 },
    ]);
    expect(page().querySelectorAll('app-smart-chart')).toHaveLength(2);
  });

  it('names a week by the Monday it starts on', () => {
    expect(weekLabel('2026-01-05')).toBe('w/c 5 Jan');
    expect(weekLabel('2026-12-28')).toBe('w/c 28 Dec');
  });

  it('lays the groups out as sections of rotating panels', () => {
    fixture.detectChanges();

    const sections = Array.from(
      page().querySelectorAll('ul.site-statistics__panels.lcars-rotate'),
    );

    expect(
      sections.map(section => section.getAttribute('data-section')),
    ).toEqual(['users', 'storytime', 'fleet', 'content']);
    expect(component.sections().map(section => section.heading)).toEqual([
      'Members',
      'Storytime',
      'Fleet Communities',
      'STO records, news and queues',
    ]);
  });

  it('shows a windowed count as four numbers under their windows', () => {
    fixture.detectChanges();

    const panel = page().querySelector('[data-card="registrations"]')!;
    const labels = Array.from(panel.querySelectorAll('dt')).map(label =>
      label.textContent?.trim(),
    );
    const values = Array.from(panel.querySelectorAll('dd')).map(value =>
      value.textContent?.trim(),
    );

    expect(panel.querySelector('h3')?.textContent?.trim()).toBe('Sign-ups');
    expect(labels).toEqual(['Today', '7 days', '30 days', 'All time']);
    expect(values).toEqual(['421', '422', '423', '424']);
    expect(
      panel.querySelector('.site-statistics__note')?.textContent,
    ).toContain('since-closed ones included');
  });

  it('shows a plain total as one number, named by role where it is one', () => {
    fixture.detectChanges();

    const spotlights = page().querySelector('[data-card="spotlights"]')!;
    const curators = page().querySelector(
      '[data-card="role-storytime_curator"]',
    )!;

    expect(spotlights.querySelector('dl')).toBeNull();
    expect(
      spotlights.querySelector('.site-statistics__total')?.textContent?.trim(),
    ).toBe('4');
    expect(curators.querySelector('h3')?.textContent?.trim()).toBe(
      'Storytime curators',
    );
    expect(
      curators.querySelector('.site-statistics__total')?.textContent?.trim(),
    ).toBe('10');
  });

  it('counts Fleet members once each, and each scope as active and registered', () => {
    fixture.detectChanges();

    const cards = component
      .sections()
      .find(section => section.key === 'fleet')!
      .cards.map(card => [card.key, card.total ?? card.windows?.allTime]);

    expect(cards).toEqual([
      ['communities', 15],
      ['fleets', 21],
      ['armadas', 2],
      ['chat', 5000],
      ['applications', 40],
      ['events', 60],
      ['communities-active', 14],
      ['fleets-active', 20],
      ['armadas-active', 2],
      ['members', 120],
    ]);
  });

  it('says when the numbers could not be read, and shows nothing else', () => {
    service.read.mockReturnValue(throwError(() => new Error('down')));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('The statistics could not be read.');
    expect(page().querySelector('app-lcars-error-message')).not.toBeNull();
    expect(page().querySelector('.site-statistics__hero')).toBeNull();
  });

  it('carries the Help link and the admin side navigation', () => {
    fixture.detectChanges();

    expect(page().querySelector('app-help-link')?.getAttribute('slug')).toBe(
      'site-admin-site-statistics',
    );
    expect(page().querySelector('app-admin-side-navigation')).not.toBeNull();
  });
});
