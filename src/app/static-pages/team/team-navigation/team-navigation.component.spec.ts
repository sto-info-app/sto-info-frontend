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
    fixture.componentRef.setInput('links', [
      { link: '/about/volunteers', label: 'Volunteers' },
      { link: '/about', label: 'About the App' },
      { link: '/about/supporters', label: 'Supporters' },
    ]);
    fixture.detectChanges();
  });

  it('should draw a Navigation panel', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Navigation');
  });

  it('should draw one full-width button a link, in the order given', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>(
        '.buttons a.full-width-btn-link',
      ),
    );

    expect(
      links.map(a => [a.getAttribute('href'), a.textContent?.trim()]),
    ).toEqual([
      ['/about/volunteers', 'Volunteers'],
      ['/about', 'About the App'],
      ['/about/supporters', 'Supporters'],
    ]);
  });
});
