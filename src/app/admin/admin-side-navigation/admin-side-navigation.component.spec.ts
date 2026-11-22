import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';

import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import { AdminSideNavigationComponent } from './admin-side-navigation.component';

/** An admin page with a link of its own. */
@Component({
  selector: 'app-admin-side-navigation-host',
  standalone: true,
  imports: [AdminSideNavigationComponent, RouterLink],
  template: `
    <app-admin-side-navigation>
      <a
        class="full-width-btn-link sunflower"
        routerLink="/elsewhere"
        >Elsewhere</a
      >
    </app-admin-side-navigation>
  `,
})
class AdminSideNavigationHostComponent {}

describe('AdminSideNavigationComponent', () => {
  it('lists the page’s own links, then the way back to Admin home', () => {
    TestBed.configureTestingModule({
      imports: [AdminSideNavigationHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(AdminSideNavigationHostComponent);
    fixture.detectChanges();

    const column = (fixture.nativeElement as HTMLElement).querySelector(
      '.admin-side-column',
    ) as HTMLElement;
    const links = Array.from(column.querySelectorAll('.buttons a'));

    expect(column.querySelector('.lcars-text-bar span')?.textContent).toBe(
      'Navigation',
    );
    expect(links.map(link => link.textContent?.trim())).toEqual([
      'Elsewhere',
      'Admin home',
    ]);
    expect(links[1].getAttribute('href')).toBe(`/${APP_ROUTES.ADMIN}`);
  });
});
