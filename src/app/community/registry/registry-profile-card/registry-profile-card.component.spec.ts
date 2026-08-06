import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { RegistryProfileSummary } from '../../models/registry.models';
import { buildProfileSummary } from '../registry-test-fixtures';
import { RegistryProfileCardComponent } from './registry-profile-card.component';

describe('RegistryProfileCardComponent', () => {
  let fixture: ComponentFixture<RegistryProfileCardComponent>;
  let component: RegistryProfileCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistryProfileCardComponent],
      providers: [
        provideRouter([]),
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
      ],
    }).compileComponents();
  });

  /**
   * Creates the card with the supplied member and runs change detection.
   *
   * @param profile - The member to render.
   */
  function render(profile: RegistryProfileSummary): void {
    fixture = TestBed.createComponent(RegistryProfileCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', profile);
    fixture.detectChanges();
  }

  it('should render the username and public counts', () => {
    render(buildProfileSummary());
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('captain.picard');
    expect(text).toContain('2');
    expect(text).toContain('11');
  });

  it('should render the joined date', () => {
    render(buildProfileSummary());

    expect(fixture.nativeElement.textContent).toContain('Joined');
  });

  it('should render the last seen date when present', () => {
    render(buildProfileSummary());

    expect(fixture.nativeElement.textContent).toContain('Last seen');
  });

  it('should omit the last seen date when the member never signed in', () => {
    render(buildProfileSummary({ lastActiveAt: null }));

    expect(fixture.nativeElement.textContent).not.toContain('Last seen');
  });

  it('should link to the public profile', () => {
    render(buildProfileSummary());

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'captain.picard',
    ]);
  });

  it('should leave the username raw for routerLink to encode', () => {
    render(buildProfileSummary({ username: 'a b/c' }));

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'a b/c',
    ]);
  });

  it('should render an avatar', () => {
    render(buildProfileSummary());

    expect(
      fixture.nativeElement.querySelector('app-entity-avatar'),
    ).toBeTruthy();
  });
});
