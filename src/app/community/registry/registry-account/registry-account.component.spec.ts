import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { buildAccount } from '../registry-test-fixtures';
import { RegistryService } from '../registry.service';
import { RegistryAccountComponent } from './registry-account.component';

describe('RegistryAccountComponent', () => {
  let fixture: ComponentFixture<RegistryAccountComponent>;
  let component: RegistryAccountComponent;
  let registryServiceSpy: { getAccount: jest.Mock };
  let seoSpy: { setPageMeta: jest.Mock };
  let pageTitleSpy: { setTitle: jest.Mock };

  /**
   * Configures the testing module and creates the component.
   *
   * @param params - The route parameters to expose.
   */
  async function setup(
    params: Record<string, string | null> = {
      username: 'captain.picard',
      accountSlug: 'SteveX~1234',
    },
  ) {
    registryServiceSpy = { getAccount: jest.fn(() => of(buildAccount())) };
    seoSpy = { setPageMeta: jest.fn() };
    pageTitleSpy = { setTitle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistryAccountComponent],
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
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => params[key] ?? null },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistryAccountComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should request the account named in the route', async () => {
    await setup();
    fixture.detectChanges();

    expect(registryServiceSpy.getAccount).toHaveBeenCalledWith(
      'captain.picard',
      'SteveX~1234',
    );
    expect(component.account).not.toBeNull();
  });

  it('should fall back to empty slugs when the route has none', async () => {
    await setup({});
    fixture.detectChanges();

    expect(component.username).toBe('');
    expect(component.accountSlug).toBe('');
  });

  it('should set the page title and social meta once loaded', async () => {
    await setup();
    fixture.detectChanges();

    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith(
      'SteveX#1234 · captain.picard',
    );
    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'SteveX#1234 · captain.picard',
      expect.stringContaining('4 public captain(s)'),
      'https://cdn.example.com/bg/public',
    );
  });

  it('should show the not-found state on a 404', async () => {
    await setup();
    registryServiceSpy.getAccount.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Account not found');
  });

  it('should show an error banner on other failures', async () => {
    await setup();
    registryServiceSpy.getAccount.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Something went wrong loading this account.',
    );
  });

  it('should render a card per captain', async () => {
    await setup();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-character-card');
    expect(cards).toHaveLength(1);
  });

  it('should render the empty state when no captains are public', async () => {
    await setup();
    registryServiceSpy.getAccount.mockReturnValue(
      of(buildAccount({ characters: [], publicCharacterCount: 0 })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'has not made any captains on this account public',
    );
    expect(
      fixture.nativeElement.querySelector('.header-count-badge'),
    ).toBeNull();
  });

  it('should hide optional account details when they are unset', async () => {
    await setup();
    registryServiceSpy.getAccount.mockReturnValue(
      of(
        buildAccount({
          platformName: null,
          launcherName: null,
          accountCreatedDate: null,
          lifetimeSubscription: false,
        }),
      ),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Lifetime Subscriber',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Playing since');
  });

  it('should link back to the owning member', async () => {
    await setup();
    fixture.detectChanges();

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'captain.picard',
    ]);
  });

  it('should leave the username raw for routerLink to encode', async () => {
    await setup({ username: 'a b', accountSlug: 'x' });
    fixture.detectChanges();

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'a b',
    ]);
  });
});
