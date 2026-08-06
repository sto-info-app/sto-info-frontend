import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { buildAccountSummary, buildProfile } from '../registry-test-fixtures';
import { RegistryService } from '../registry.service';
import { RegistryProfileComponent } from './registry-profile.component';

describe('RegistryProfileComponent', () => {
  let fixture: ComponentFixture<RegistryProfileComponent>;
  let component: RegistryProfileComponent;
  let registryServiceSpy: { getProfile: jest.Mock };
  let seoSpy: { setPageMeta: jest.Mock };
  let pageTitleSpy: { setTitle: jest.Mock };

  /**
   * Configures the testing module and creates the component.
   *
   * @param username - The username route parameter.
   */
  async function setup(username: string | null = 'captain.picard') {
    registryServiceSpy = { getProfile: jest.fn(() => of(buildProfile())) };
    seoSpy = { setPageMeta: jest.fn() };
    pageTitleSpy = { setTitle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistryProfileComponent],
      providers: [
        provideRouter([]),
        { provide: RegistryService, useValue: registryServiceSpy },
        { provide: SeoService, useValue: seoSpy },
        { provide: PageTitleService, useValue: pageTitleSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => username } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistryProfileComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should request the member named in the route', async () => {
    await setup();
    fixture.detectChanges();

    expect(registryServiceSpy.getProfile).toHaveBeenCalledWith(
      'captain.picard',
    );
    expect(component.profile).not.toBeNull();
  });

  it('should fall back to an empty username when the route has none', async () => {
    await setup(null);
    fixture.detectChanges();

    expect(component.username).toBe('');
  });

  it('should set the page title and social meta once loaded', async () => {
    await setup();
    fixture.detectChanges();

    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith('captain.picard');
    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'captain.picard',
      expect.stringContaining('2 account(s)'),
      'https://cdn.example.com/pic/square300',
    );
  });

  it('should omit the image when the member has no profile picture', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ profilePicture300: null })),
    );
    fixture.detectChanges();

    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'captain.picard',
      expect.any(String),
      undefined,
    );
  });

  it('should show the not-found state on a 404', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Record not found');
  });

  it('should show an error banner on other failures', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Something went wrong loading this profile.',
    );
    expect(
      fixture.nativeElement.querySelector('app-lcars-error-message'),
    ).toBeTruthy();
  });

  it('should render each of the member accounts', async () => {
    await setup();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-account-card');
    expect(cards).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('SteveX#1234');
  });

  it('should build read-only account cards with no actions or endeavour badge', async () => {
    await setup();
    fixture.detectChanges();

    expect(component.accountCards).toHaveLength(1);
    expect(component.accountCards[0].actions).toEqual([]);
    expect(component.accountCards[0].endeavour).toBeNull();
    expect(component.accountCards[0].link).toEqual([
      '/community/registry/profiles',
      'captain.picard',
      'SteveX~1234',
    ]);
  });

  it('should surface visibly labelled, non-personal detail rows', async () => {
    await setup();
    fixture.detectChanges();

    const details = component.accountCards[0].details;
    expect(details.map(detail => detail.label)).toEqual([
      'Platform',
      'Launcher',
      'Playing Since',
      'Lifetime Subscription',
    ]);
    expect(details.every(detail => detail.showLabel)).toBe(true);
  });

  it('should render the empty state when no accounts are public', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ accounts: [] })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'has not made any accounts public',
    );
  });

  it('should hide optional account details when they are unset', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(
        buildProfile({
          accounts: [
            buildAccountSummary({
              platformName: null,
              launcherName: null,
              accountCreatedDate: null,
              lifetimeSubscription: false,
            }),
          ],
        }),
      ),
    );
    fixture.detectChanges();

    const labels = component.accountCards[0].details.map(
      detail => detail.label,
    );
    expect(labels).toEqual(['Lifetime Subscription']);
    expect(component.accountCards[0].lifetimeSubscription).toBe(false);
  });

  it('should hide the last-seen line for a member who never signed in', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ lastActiveAt: null })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Last seen');
  });

  it('should leave account link segments raw for routerLink to encode', async () => {
    await setup('a b');
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ accounts: [buildAccountSummary({ slug: 'c/d' })] })),
    );
    fixture.detectChanges();

    expect(component.accountCards[0].link).toEqual([
      '/community/registry/profiles',
      'a b',
      'c/d',
    ]);
  });

  it('should delegate route links to the routing service', async () => {
    await setup();
    fixture.detectChanges();

    expect(component.getRouteLink('community/registry/profiles')).toBe(
      '/community/registry/profiles',
    );
  });
});
