import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { buildCharacter } from '../registry-test-fixtures';
import { RegistryService } from '../registry.service';
import { RegistryCharacterComponent } from './registry-character.component';

describe('RegistryCharacterComponent', () => {
  let fixture: ComponentFixture<RegistryCharacterComponent>;
  let component: RegistryCharacterComponent;
  let registryServiceSpy: { getCharacter: jest.Mock };
  let seoSpy: { setPageMeta: jest.Mock };
  let pageTitleSpy: { setTitle: jest.Mock };

  const defaultParams = {
    username: 'captain.picard',
    accountSlug: 'SteveX~1234',
    characterSlug: 'Rex',
  };

  /**
   * Configures the testing module and creates the component.
   *
   * @param params - The route parameters to expose.
   */
  async function setup(params: Record<string, string | null> = defaultParams) {
    registryServiceSpy = { getCharacter: jest.fn(() => of(buildCharacter())) };
    seoSpy = { setPageMeta: jest.fn() };
    pageTitleSpy = { setTitle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistryCharacterComponent],
      providers: [
        provideRouter([]),
        { provide: RegistryService, useValue: registryServiceSpy },
        { provide: SeoService, useValue: seoSpy },
        { provide: PageTitleService, useValue: pageTitleSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
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

    fixture = TestBed.createComponent(RegistryCharacterComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should request the captain named in the route', async () => {
    await setup();
    fixture.detectChanges();

    expect(registryServiceSpy.getCharacter).toHaveBeenCalledWith(
      'captain.picard',
      'SteveX~1234',
      'Rex@SteveX~1234',
    );
    expect(component.character).not.toBeNull();
  });

  it('should fall back to empty slugs when the route has none', async () => {
    await setup({});
    fixture.detectChanges();

    expect(component.username).toBe('');
    expect(component.accountSlug).toBe('');
    expect(component.characterSlug).toBe('');
  });

  it('should use the biography as the social description', async () => {
    await setup();
    fixture.detectChanges();

    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith('Rex · captain.picard');
    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'Rex · captain.picard',
      'A long and storied career.',
      'https://cdn.example.com/char/square300',
    );
  });

  it('should build a description from the rank and lookups when there is no biography', async () => {
    await setup();
    registryServiceSpy.getCharacter.mockReturnValue(
      of(buildCharacter({ biography: null })),
    );
    fixture.detectChanges();

    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      expect.any(String),
      'Rex — Fleet Admiral, Vulcan, Tactical.',
      expect.any(String),
    );
  });

  it('should fall back to a generic description when nothing is known', async () => {
    await setup();
    registryServiceSpy.getCharacter.mockReturnValue(
      of(
        buildCharacter({
          biography: null,
          rank: null,
          species: null,
          class: null,
          profilePicture300: null,
        }),
      ),
    );
    fixture.detectChanges();

    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      expect.any(String),
      'Rex in the Galactic Personnel Registry.',
      undefined,
    );
  });

  it('should show the not-found state on a 404', async () => {
    await setup();
    registryServiceSpy.getCharacter.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Captain not found');
  });

  it('should show an error banner on other failures', async () => {
    await setup();
    registryServiceSpy.getCharacter.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Something went wrong loading this captain.',
    );
  });

  describe('fullName', () => {
    it('should be null before the captain has loaded', async () => {
      await setup();

      expect(component.fullName).toBeNull();
    });

    it('should join the recorded name parts', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.fullName).toBe('Rex Sorek');
    });

    it('should include a middle name when present', async () => {
      await setup();
      registryServiceSpy.getCharacter.mockReturnValue(
        of(buildCharacter({ middleName: 'T' })),
      );
      fixture.detectChanges();

      expect(component.fullName).toBe('Rex T Sorek');
    });

    it('should be null when no name parts are recorded', async () => {
      await setup();
      registryServiceSpy.getCharacter.mockReturnValue(
        of(
          buildCharacter({
            firstName: null,
            middleName: null,
            lastName: null,
          }),
        ),
      );
      fixture.detectChanges();

      expect(component.fullName).toBeNull();
    });
  });

  describe('template', () => {
    it('should render the service record fields', async () => {
      await setup();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll(
        '.registry-detail-grid dt, .registry-detail-grid dd',
      );
      expect(rows.length).toBeGreaterThan(0);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Fleet Admiral');
      expect(text).toContain('Vulcan');
      expect(text).toContain('Tactical');
      expect(text).toContain('Federation');
      expect(text).toContain('Standard');
      expect(text).toContain('Commissioned');
    });

    it('should render the biography section', async () => {
      await setup();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Biography');
      expect(fixture.nativeElement.textContent).toContain(
        'A long and storied career.',
      );
    });

    it('should omit the biography section when there is none', async () => {
      await setup();
      registryServiceSpy.getCharacter.mockReturnValue(
        of(buildCharacter({ biography: null })),
      );
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.registry-character-biography'),
      ).toBeNull();
    });

    it('should omit optional fields that are unset', async () => {
      await setup();
      registryServiceSpy.getCharacter.mockReturnValue(
        of(
          buildCharacter({
            level: null,
            rank: null,
            sex: null,
            class: null,
            species: null,
            faction: null,
            generalFaction: null,
            recruitType: null,
            createdDate: null,
            firstName: null,
            middleName: null,
            lastName: null,
          }),
        ),
      );
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll(
        '.registry-detail-grid dt, .registry-detail-grid dd',
      );
      expect(rows).toHaveLength(0);
    });

    it('should never render the owner private notes field', async () => {
      await setup();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Notes');
    });
  });

  describe('links', () => {
    it('should link back to the owning account', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.accountLink).toEqual([
        '/community/registry/profiles',
        'captain.picard',
        'SteveX~1234',
      ]);
    });

    it('should link back to the owning member', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.profileLink).toEqual([
        '/community/registry/profiles',
        'captain.picard',
      ]);
    });

    it('should leave segments raw for routerLink to encode', async () => {
      await setup({ username: 'a b', accountSlug: 'c/d', characterSlug: 'e' });
      fixture.detectChanges();

      expect(component.accountLink).toEqual([
        '/community/registry/profiles',
        'a b',
        'c/d',
      ]);
      expect(component.profileLink).toEqual([
        '/community/registry/profiles',
        'a b',
      ]);
    });
  });
});
