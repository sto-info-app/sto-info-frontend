import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';
import { AdminComponent } from './admin.component';
import { ModerationHoldAdminService } from './moderation-admin/moderation-hold-admin.service';
import { FeatureSwitchesAdminService } from './feature-switches/feature-switches-admin.service';
import { PublicationPauseAdminService } from './publication-pause/publication-pause-admin.service';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let accessControlService: { getMyPermissions: jest.Mock };
  let storytimeService: { isEnabled: jest.Mock };
  let holds: { openCounts: jest.Mock };

  /**
   * The hrefs of every link on the rendered page.
   *
   * @returns The hrefs, in document order.
   */
  const hrefs = (): (string | null)[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => link.getAttribute('href'));

  beforeEach(async () => {
    // Storytime is on, and this administrator runs none of it. The management
    // cards are the exception on this page, not the rule.
    storytimeService = { isEnabled: jest.fn().mockReturnValue(of(true)) };
    holds = { openCounts: jest.fn(() => of({ total: 0 })) };
    accessControlService = {
      getMyPermissions: jest
        .fn()
        .mockReturnValue(of(new Set<string>() as ReadonlySet<string>)),
    };

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: AccessControlService, useValue: accessControlService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: ModerationHoldAdminService, useValue: holds },
        // The publication pause's own spec covers it (FC-042).
        {
          provide: PublicationPauseAdminService,
          useValue: {
            read: () =>
              of({
                paused: false,
                pausedAt: null,
                pausedByUserId: null,
                pausedByUsername: null,
                queuePaused: false,
                held: 0,
              }),
          },
        },
        // The feature switches' own spec covers them (FC-045).
        {
          provide: FeatureSwitchesAdminService,
          useValue: { list: () => of([]) },
        },
        { provide: AuthService, useValue: { getUserId: () => 'admin-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('counts the open reports of both kinds beside Community (FC-036)', () => {
    holds.openCounts.mockReturnValue(of({ total: 4 }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Community · 4 open reports',
    );
    expect(hrefs()).toEqual(
      expect.arrayContaining(['/admin/holds', '/admin/fleet-investigations']),
    );
  });

  it('names Community alone when nothing is open, or the count is unknown', () => {
    fixture.detectChanges();
    expect(component.openReports).toBe(0);

    holds.openCounts.mockReturnValue(throwError(() => new Error('down')));
    component.ngOnInit();
    expect(component.openReports).toBeNull();
  });

  it('builds route links', () => {
    expect(component.getRouteLink('admin/news')).toBe('/admin/news');
  });

  it('links to the permission overrides page', () => {
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[href="/admin/permissions"]',
    );
    expect(link?.textContent).toContain('Manage Permissions');
  });

  // Steve's decision of 30 September 2026: a site administrator reaches any
  // Community's dispute page, and this is the way in to a hidden one.
  it('links to the Fleet disputes page (FC-050)', () => {
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[href="/admin/fleet-disputes"]',
    );
    expect(link?.textContent).toContain('Fleet Disputes');
  });

  // Steve's decision of 30 September 2026: the kill switch for publication
  // sits under Operations, with the scanner it holds back.
  it('offers the publication pause under Operations (FC-042)', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-publication-pause')).not.toBeNull();
    expect(element.textContent).toContain('Publication is running.');
    expect(element.textContent).toContain('Pause publication');
  });

  // Steve's decision of 6 October 2026: no feature switch needs SQL, and
  // they sit beside the publication pause.
  it('offers the feature switches under Operations, after the publication pause (FC-045)', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const pause = element.querySelector('app-publication-pause')!;
    const switches = element.querySelector('app-feature-switches');

    expect(switches).not.toBeNull();
    expect(pause.nextElementSibling).toBe(switches);
    expect(element.textContent).toContain('Features');
  });

  it('links to the scan diagnostics page', () => {
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[href="/admin/scan-diagnostics"]',
    );
    expect(link?.textContent).toContain('Scan Diagnostics');
  });

  // The same cards the Storytime landing page offers. Everything else on this
  // page comes with the administrator role; these three are given out one at a
  // time by permission, so they are filtered rather than assumed.
  describe('the Storytime section', () => {
    /**
     * Renders the page for an administrator holding the given permissions.
     *
     * @param permissions - The permission codes held.
     * @returns The rendered element.
     */
    const renderHolding = (permissions: string[]): HTMLElement => {
      accessControlService.getMyPermissions.mockReturnValue(
        of(new Set<string>(permissions) as ReadonlySet<string>),
      );
      fixture.detectChanges();

      return fixture.nativeElement as HTMLElement;
    };

    it('offers nothing of the kind to an administrator given none of it', () => {
      const element = renderHolding([]);

      expect(element.textContent).not.toContain('Moderation queue');
      expect(hrefs()).not.toContain(`/${APP_ROUTES.STORYTIME_MODERATION}`);
    });

    it('offers the moderation queue to a Storytime moderator', () => {
      const element = renderHolding([PERMISSIONS.STORYTIME_MODERATE]);

      expect(element.textContent).toContain('Moderation queue');
      expect(hrefs()).toContain(`/${APP_ROUTES.STORYTIME_MODERATION}`);
    });

    // A card for a page the route would refuse is worse than no card at all.
    it('offers only the pages the permission is held for', () => {
      renderHolding([PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE]);

      expect(hrefs()).toContain(`/${APP_ROUTES.STORYTIME_MANAGE_SPOTLIGHT}`);
      expect(hrefs()).not.toContain(`/${APP_ROUTES.STORYTIME_MODERATION}`);
      expect(hrefs()).not.toContain(`/${APP_ROUTES.STORYTIME_MANAGE_TAGS}`);
    });

    it('offers all three to somebody who runs the whole of it', () => {
      renderHolding([
        PERMISSIONS.STORYTIME_MODERATE,
        PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
        PERMISSIONS.STORYTIME_TAG_MANAGE,
      ]);

      expect(component.storytimeLinks).toHaveLength(3);
      expect(hrefs()).toContain(`/${APP_ROUTES.STORYTIME_MANAGE_TAGS}`);
    });

    // With the feature off there is nothing to run, and this page would be the
    // last place on the site still advertising it.
    it('offers nothing while Storytime is switched off', () => {
      storytimeService.isEnabled.mockReturnValue(of(false));

      const element = renderHolding([PERMISSIONS.STORYTIME_MODERATE]);

      expect(element.textContent).not.toContain('Moderation queue');
      expect(accessControlService.getMyPermissions).not.toHaveBeenCalled();
    });

    // The rest of the page is worth more than these three cards, so a lookup
    // that fails costs the cards rather than the page.
    it('shows the page when the permissions cannot be read', () => {
      accessControlService.getMyPermissions.mockReturnValue(
        throwError(() => new Error('nope')),
      );

      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).not.toContain('Moderation queue');
      expect(hrefs()).toContain('/admin/news');
    });
  });
});
