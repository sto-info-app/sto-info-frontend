import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountCardComponent } from './account-card.component';
import { AccountCardVm } from './account-card.model';

@Component({
  standalone: true,
  template: '',
})
class DummyRouteComponent {}

/**
 * Builds an account card model with sensible owner-facing defaults.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns An account card presentation model.
 */
function buildVm(overrides: Partial<AccountCardVm> = {}): AccountCardVm {
  return {
    id: 'account-1',
    handle: 'SteveX#1234',
    link: '/dashboard/accounts/SteveX~1234',
    themeClass: 'platform-pc launcher-arc',
    bgImagePath: '/assets/account-types/account_type_windows_arc.jpg',
    lifetimeSubscription: true,
    characterCount: 5,
    platformName: 'Windows',
    launcherName: 'Arc',
    details: [{ icon: 'fas fa-user', text: 'stevex', label: 'Username' }],
    endeavour: { totalNodes: 512, link: '/dashboard/accounts/x/endeavours' },
    actions: [
      { key: 'edit', icon: 'fas fa-user-pen', title: 'Edit Account' },
      {
        key: 'delete',
        icon: 'fas fa-trash',
        title: 'Delete Account',
        destructive: true,
      },
    ],
    ...overrides,
  };
}

describe('AccountCardComponent', () => {
  let fixture: ComponentFixture<AccountCardComponent>;
  let component: AccountCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountCardComponent],
      providers: [
        provideRouter([
          {
            path: 'dashboard/accounts/:handle',
            component: DummyRouteComponent,
          },
          {
            path: 'dashboard/accounts/:handle/endeavours',
            component: DummyRouteComponent,
          },
        ]),
      ],
    }).compileComponents();
  });

  /**
   * Creates the card with the supplied model and runs change detection.
   *
   * @param vm - The card model to render.
   */
  function render(vm: AccountCardVm): void {
    fixture = TestBed.createComponent(AccountCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', vm);
    fixture.detectChanges();
  }

  it('should render the handle and captain count', () => {
    render(buildVm());

    expect(fixture.nativeElement.textContent).toContain('SteveX#1234');
    expect(
      fixture.nativeElement.querySelector('.header-captain-number').textContent,
    ).toContain('5');
  });

  it('should apply the platform and launcher theme classes', () => {
    render(buildVm());

    const card = fixture.nativeElement.querySelector('.account-card');
    expect(card.classList.contains('platform-pc')).toBe(true);
    expect(card.classList.contains('launcher-arc')).toBe(true);
  });

  it('should show the lifetime badge only when subscribed', () => {
    render(buildVm());
    expect(fixture.nativeElement.querySelector('.lifetime-icon')).toBeTruthy();

    render(buildVm({ lifetimeSubscription: false }));
    expect(fixture.nativeElement.querySelector('.lifetime-icon')).toBeNull();
  });

  it('should render each detail row with its icon', () => {
    render(
      buildVm({
        details: [
          { icon: 'fas fa-user', text: 'stevex' },
          { icon: 'fas fa-envelope', text: 'a@b.c', variant: 'secondary' },
          { icon: 'fas fa-note-sticky', text: 'notes', variant: 'muted' },
        ],
      }),
    );

    const rows = fixture.nativeElement.querySelectorAll('.account-detail-row');
    expect(rows).toHaveLength(3);
    expect(rows[1].classList.contains('account-detail-row--secondary')).toBe(
      true,
    );
    expect(rows[2].classList.contains('account-detail-row--muted')).toBe(true);
  });

  it('should render a visible label and drop the redundant icon', () => {
    render(
      buildVm({
        details: [
          {
            icon: 'fas fa-desktop',
            text: 'Windows',
            label: 'Platform',
            showLabel: true,
          },
        ],
      }),
    );

    expect(
      fixture.nativeElement.querySelector('.account-detail-label').textContent,
    ).toContain('Platform');
    expect(
      fixture.nativeElement.querySelector('.account-detail-value i'),
    ).toBeNull();
    // The visible label replaces the screen-reader-only one, so it is not
    // announced twice.
    expect(
      fixture.nativeElement.querySelector('.account-detail-row .sr-only'),
    ).toBeNull();
  });

  it('should keep the icon and hide the label when the label is not shown', () => {
    render(buildVm());

    expect(
      fixture.nativeElement.querySelector('.account-detail-value i'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.account-detail-label'),
    ).toBeNull();
  });

  describe('hasVisibleLabels', () => {
    it('should switch the body to the label/value grid when a row is labelled', () => {
      render(
        buildVm({
          details: [
            {
              icon: 'fas fa-desktop',
              text: 'Windows',
              label: 'Platform',
              showLabel: true,
            },
          ],
        }),
      );

      expect(component.hasVisibleLabels).toBe(true);
      expect(
        fixture.nativeElement
          .querySelector('.account-body-info')
          .classList.contains('account-body-info--labelled'),
      ).toBe(true);
    });

    it('should keep the stacked layout when no row is labelled', () => {
      render(buildVm());

      expect(component.hasVisibleLabels).toBe(false);
      expect(
        fixture.nativeElement
          .querySelector('.account-body-info')
          .classList.contains('account-body-info--labelled'),
      ).toBe(false);
    });

    it('should be false when there are no detail rows at all', () => {
      render(buildVm({ details: [] }));

      expect(component.hasVisibleLabels).toBe(false);
    });
  });

  it('should not mark a default detail row with a variant class', () => {
    render(buildVm());

    const row = fixture.nativeElement.querySelector('.account-detail-row');
    expect(row.classList.contains('account-detail-row--secondary')).toBe(false);
    expect(row.classList.contains('account-detail-row--muted')).toBe(false);
  });

  it('should render the screen-reader platform and launcher labels', () => {
    render(buildVm());

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform: Windows');
    expect(text).toContain('Launcher: Arc');
  });

  it('should omit the launcher label when no launcher is set', () => {
    render(buildVm({ launcherName: null }));

    expect(fixture.nativeElement.textContent).not.toContain('Launcher:');
  });

  it('should render the endeavour badge when supplied', () => {
    render(buildVm());

    expect(
      fixture.nativeElement.querySelector('app-endeavour-rank-badge'),
    ).toBeTruthy();
  });

  it('should omit the endeavour column for read-only cards', () => {
    render(buildVm({ endeavour: null }));

    expect(
      fixture.nativeElement.querySelector('.account-body-stats'),
    ).toBeNull();
  });

  it('should omit the action column when there are no actions', () => {
    render(buildVm({ actions: [] }));

    expect(
      fixture.nativeElement.querySelector('.account-body-actions'),
    ).toBeNull();
  });

  it('should mark destructive actions', () => {
    render(buildVm());

    const buttons = fixture.nativeElement.querySelectorAll(
      '.account-body-actions button',
    );
    expect(buttons[0].classList.contains('delete-icon')).toBe(false);
    expect(buttons[1].classList.contains('delete-icon')).toBe(true);
  });

  it('should emit the action key and stop the click from navigating', () => {
    render(buildVm());
    const emitted: string[] = [];
    component.action.subscribe(key => emitted.push(key));

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopSpy = jest.spyOn(event, 'stopPropagation');
    fixture.nativeElement
      .querySelectorAll('.account-body-actions button')[1]
      .dispatchEvent(event);

    expect(emitted).toEqual(['delete']);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should stop nested link clicks from also navigating the card', () => {
    render(buildVm());

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopSpy = jest.spyOn(event, 'stopPropagation');
    fixture.nativeElement
      .querySelector('.header-captain-count')
      .dispatchEvent(event);

    expect(stopSpy).toHaveBeenCalled();
  });
});
