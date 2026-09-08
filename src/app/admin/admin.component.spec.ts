import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let accessControlService: { getMyPermissions: jest.Mock };
  let storytimeService: { isEnabled: jest.Mock };

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
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
