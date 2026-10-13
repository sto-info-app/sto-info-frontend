import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FleetBackLinkComponent } from './fleet-back-link.component';

describe('FleetBackLinkComponent', () => {
  let fixture: ComponentFixture<FleetBackLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetBackLinkComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetBackLinkComponent);
    fixture.componentRef.setInput('link', [
      '/fleets',
      'communities',
      'ufa',
      'manage',
    ]);
    fixture.componentRef.setInput('label', 'Back to Manage');
    fixture.detectChanges();
  });

  it('draws the way back as a pill on a row of its own', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.buttons-row > a.lcars-btn',
    );

    expect(link?.textContent?.trim()).toBe('Back to Manage');
    expect(link?.getAttribute('href')).toBe('/fleets/communities/ufa/manage');
  });
});
