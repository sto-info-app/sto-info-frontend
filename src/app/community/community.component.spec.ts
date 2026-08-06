import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let fixture: ComponentFixture<CommunityComponent>;
  let component: CommunityComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [
        provideRouter([]),
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the registry links in the side column', () => {
    const links = fixture.nativeElement.querySelectorAll(
      '#community-side-column .buttons a',
    );

    expect(links).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Search the Registry');
    expect(fixture.nativeElement.textContent).toContain('Recently Joined');
    expect(fixture.nativeElement.textContent).toContain('Recently Active');
    expect(fixture.nativeElement.textContent).toContain('Profiles');
  });

  it('should use the two-column page shell', () => {
    expect(
      fixture.nativeElement.querySelector('#community-main-column'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('#community-side-column'),
    ).toBeTruthy();
  });

  it('should state that the registry is opt-in', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Nothing appears here until you opt in',
    );
  });

  it('should not advertise unbuilt sections', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Coming Soon');
    expect(text).not.toContain('Fleets');
    expect(text).not.toContain('Events');
  });

  it('should delegate route links to the routing service', () => {
    expect(component.getRouteLink('community/registry/search')).toBe(
      '/community/registry/search',
    );
  });
});
