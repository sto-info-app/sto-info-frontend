import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TeamNavigationComponent } from './team-navigation.component';

describe('TeamNavigationComponent', () => {
  let fixture: ComponentFixture<TeamNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamNavigationComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamNavigationComponent);
    fixture.componentRef.setInput('crossLink', {
      link: '/about/volunteers',
      label: 'Volunteers',
    });
    fixture.detectChanges();
  });

  it('should draw a Navigation panel', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Navigation');
  });

  it('should draw one full-width button to the other team list', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>(
      '.buttons a.full-width-btn-link',
    );

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/about/volunteers');
    expect(links[0].textContent?.trim()).toBe('Volunteers');
  });
});
