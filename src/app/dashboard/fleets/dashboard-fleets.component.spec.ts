import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { CommunitySubscriptionService } from 'src/app/fleet/community-subscription.service';
import {
  FleetAudience,
  FleetCommunity,
  FleetConfiguration,
  FleetRecruitmentState,
  FleetScopeStatus,
  FollowedCommunity,
} from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { DashboardFleetsComponent } from './dashboard-fleets.component';

/**
 * Builds a Community as the server sends it.
 *
 * @param overrides - Fields to override.
 * @returns The Community.
 */
function community(overrides: Partial<FleetCommunity> = {}): FleetCommunity {
  return {
    id: 'community-1',
    ownerUserId: 'user-1',
    name: 'United Federation Alliance',
    slug: 'united-federation-alliance',
    description: 'A home for casual PvE fleets.',
    recruitmentState: FleetRecruitmentState.OPEN,
    visibility: FleetAudience.PUBLIC,
    preferredTimezone: 'Europe/London',
    status: FleetScopeStatus.ACTIVE,
    closedAt: null,
    revision: 1,
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    bannerImageId: null,
    bannerImageAlt: null,
    emblemImageId: null,
    emblemImageAlt: null,
    ...overrides,
  };
}

/**
 * Builds one entry of the followed list.
 *
 * @param overrides - Fields of the Community to override.
 * @returns The followed Community.
 */
function followed(overrides: Partial<FleetCommunity> = {}): FollowedCommunity {
  return {
    community: community(overrides),
    followedAt: '2026-02-03T04:05:06.000Z',
  };
}

/**
 * Builds the feature configuration.
 *
 * @param isEnabled - Whether the feature is switched on.
 * @returns The configuration.
 */
function configuration(isEnabled: boolean): FleetConfiguration {
  return {
    features: { isEnabled },
  } as FleetConfiguration;
}

describe('DashboardFleetsComponent', () => {
  let fixture: ComponentFixture<DashboardFleetsComponent>;
  let fleetConfiguration: { getConfiguration: jest.Mock };
  let subscriptions: { listFollowed: jest.Mock };

  /** Everything the page currently says. */
  const text = (): string => fixture.nativeElement.textContent as string;

  /** The cards drawn for what the member follows. */
  const cards = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('app-fleet-scope-card'));

  /** Renders the page with whatever the mocks are set to. */
  const render = (): void => {
    fixture = TestBed.createComponent(DashboardFleetsComponent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fleetConfiguration = {
      getConfiguration: jest.fn().mockReturnValue(of(configuration(true))),
    };

    subscriptions = {
      listFollowed: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardFleetsComponent],
      providers: [
        { provide: FleetConfigurationService, useValue: fleetConfiguration },
        { provide: CommunitySubscriptionService, useValue: subscriptions },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    render();

    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('what it lists', () => {
    it('should draw a card for each Community followed', () => {
      subscriptions.listFollowed.mockReturnValue(
        of([
          followed(),
          followed({ id: 'community-2', name: 'Klingon Defence Force' }),
        ]),
      );

      render();

      expect(cards()).toHaveLength(2);
      expect(text()).toContain('United Federation Alliance');
      expect(text()).toContain('Klingon Defence Force');
    });

    it('should count what is followed rather than choose from it', () => {
      subscriptions.listFollowed.mockReturnValue(
        of([
          followed(),
          followed({ id: 'community-2', name: 'Klingon Defence Force' }),
          followed({ id: 'community-3', name: 'Romulan Republic' }),
        ]),
      );

      render();

      expect(text()).toContain('Following');
      expect(text()).toContain('3');
    });

    it('should link each card to the Community it names', () => {
      subscriptions.listFollowed.mockReturnValue(of([followed()]));

      render();
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
        'app-fleet-scope-card a',
      );

      expect(link.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance',
      );
    });

    it('should offer no way to stop following from here', () => {
      subscriptions.listFollowed.mockReturnValue(of([followed()]));

      render();

      expect(text()).not.toContain('Stop following');
      expect(text()).not.toContain('Unfollow');
    });
  });

  describe('when nothing is followed', () => {
    it('should say so and explain what following is', () => {
      render();

      expect(cards()).toHaveLength(0);
      expect(text()).toContain('Nothing followed yet');
      expect(text()).toContain('It is not membership of it');
    });

    it('should offer all three directories and registering', () => {
      render();
      const labels = Array.from(
        fixture.nativeElement.querySelectorAll(
          'nav[aria-label="Fleet directories"] a',
        ) as NodeListOf<HTMLAnchorElement>,
      ).map(link => link.textContent?.trim());

      expect(labels).toEqual([
        'Browse Fleets',
        'Browse Communities',
        'Browse Armadas',
        'Register a Community',
      ]);
    });
  });

  describe('when the section cannot be used', () => {
    it('should say the feature is switched off', () => {
      fleetConfiguration.getConfiguration.mockReturnValue(
        of(configuration(false)),
      );

      render();

      expect(text()).toContain('Fleet Community');
      expect(text()).toContain('switched off');
      expect(cards()).toHaveLength(0);
    });

    it('should not ask what is followed while the feature is off', () => {
      fleetConfiguration.getConfiguration.mockReturnValue(
        of(configuration(false)),
      );

      render();

      expect(subscriptions.listFollowed).not.toHaveBeenCalled();
    });

    it('should say the systems are not answering when they are not', () => {
      fleetConfiguration.getConfiguration.mockReturnValue(of(null));

      render();

      expect(text()).toContain('not answering');
      expect(subscriptions.listFollowed).not.toHaveBeenCalled();
    });

    it('should report a list that could not be read', () => {
      subscriptions.listFollowed.mockReturnValue(
        throwError(() => new Error('network')),
      );

      render();

      expect(text()).toContain('Transmission failed');
      expect(text()).not.toContain('Nothing followed yet');
    });
  });

  it('should say nothing at all until an answer arrives', () => {
    fleetConfiguration.getConfiguration.mockReturnValue(of());

    render();

    expect(text()).toContain('Reading what you follow');
    expect(cards()).toHaveLength(0);
  });
});
