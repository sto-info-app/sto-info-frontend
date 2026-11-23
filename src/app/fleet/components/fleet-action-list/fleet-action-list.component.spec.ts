import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FleetActionListComponent } from './fleet-action-list.component';

describe('FleetActionListComponent', () => {
  let fixture: ComponentFixture<FleetActionListComponent>;

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetActionListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetActionListComponent);
    fixture.componentRef.setInput('actions', [
      {
        label: 'Settings',
        link: ['/fleets', 'standalone', 'pc', 'ufa', 'settings'],
        description: 'Rename the Fleet.',
      },
      {
        label: 'Delegation',
        link: ['/fleets', 'standalone', 'pc', 'ufa', 'delegation'],
        description: 'Choose what every Officer may do.',
      },
    ]);
    fixture.detectChanges();
  });

  it('draws each place as a pill with what it is for beside it', () => {
    const items = [
      ...element().querySelectorAll('.fleet-action-list__item'),
    ].map(item => ({
      label: item.querySelector('a.lcars-btn')?.textContent?.trim(),
      href: item.querySelector('a.lcars-btn')?.getAttribute('href'),
      description: item
        .querySelector('.fleet-action-list__description')
        ?.textContent?.trim(),
    }));

    expect(items).toEqual([
      {
        label: 'Settings',
        href: '/fleets/standalone/pc/ufa/settings',
        description: 'Rename the Fleet.',
      },
      {
        label: 'Delegation',
        href: '/fleets/standalone/pc/ufa/delegation',
        description: 'Choose what every Officer may do.',
      },
    ]);
  });

  it('rotates the palette down the list', () => {
    expect(
      element().querySelector('ul.fleet-action-list')?.classList,
    ).toContain('lcars-rotate');
  });
});
