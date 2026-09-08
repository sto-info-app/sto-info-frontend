import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PERMISSIONS, Permission } from 'src/app/models/access-control.models';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<button
    *appHasPermission="permission"
    type="button">
    Create Story
  </button>`,
})
class HostComponent {
  permission: Permission = PERMISSIONS.STORYTIME_STORY_CREATE;
}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let permitted$: BehaviorSubject<boolean>;

  /**
   * Counts the buttons currently rendered by the host template.
   *
   * @returns The number of rendered buttons.
   */
  const renderedButtons = (): number =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').length;

  beforeEach(() => {
    permitted$ = new BehaviorSubject<boolean>(false);

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: AccessControlService,
          useValue: { hasPermission: () => permitted$.asObservable() },
        },
      ],
    });

    fixture = TestBed.createComponent(HostComponent);
  });

  it('renders nothing when the permission is not held', () => {
    fixture.detectChanges();

    expect(renderedButtons()).toBe(0);
  });

  it('renders the content when the permission is held', () => {
    permitted$.next(true);
    fixture.detectChanges();

    expect(renderedButtons()).toBe(1);
  });

  it('removes the content when the permission is withdrawn', () => {
    permitted$.next(true);
    fixture.detectChanges();
    expect(renderedButtons()).toBe(1);

    permitted$.next(false);
    fixture.detectChanges();

    expect(renderedButtons()).toBe(0);
  });

  // Guards against the view being created twice on a repeated emission, which
  // would render the control more than once.
  it('does not duplicate the content when permission is re-confirmed', () => {
    permitted$.next(true);
    fixture.detectChanges();
    permitted$.next(true);
    fixture.detectChanges();

    expect(renderedButtons()).toBe(1);
  });

  it('does nothing when the permission stays withheld', () => {
    permitted$.next(false);
    fixture.detectChanges();

    expect(renderedButtons()).toBe(0);
  });
});
