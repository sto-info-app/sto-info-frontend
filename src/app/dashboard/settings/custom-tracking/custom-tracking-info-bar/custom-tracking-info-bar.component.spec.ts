import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackingInfoBarComponent } from './custom-tracking-info-bar.component';

@Component({
  standalone: true,
  imports: [CustomTrackingInfoBarComponent],
  template: `
    <app-custom-tracking-info-bar
      kind="tab"
      name="Ships">
      <button
        infoActions
        type="button">
        Move it
      </button>
    </app-custom-tracking-info-bar>
  `,
})
class HostComponent {}

describe('CustomTrackingInfoBarComponent', () => {
  let fixture: ComponentFixture<CustomTrackingInfoBarComponent>;
  let component: CustomTrackingInfoBarComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const panel = (): HTMLElement =>
    fixture.nativeElement.querySelector('.custom-tracking-info-bar');

  const build = (
    overrides: Partial<CustomTrackingInfoBarComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingInfoBarComponent);
    component = fixture.componentInstance;
    component.name = 'Ships';
    component.kind = 'tab';
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingInfoBarComponent, HostComponent],
    }).compileComponents();
  });

  it('names the thing and says what kind of thing it is', () => {
    build();

    expect(text()).toContain('Ships');
    expect(text()).toContain('tab');
  });

  it('says what is inside where it was given a count', () => {
    build({ summary: '2 fields' });

    expect(text()).toContain('2 fields');
  });

  it('counts nothing where it was given nothing to count', () => {
    build();

    expect(
      fixture.nativeElement.querySelector('.custom-tracking-count'),
    ).toBeNull();
  });

  // Public is opt-in, so the panel says which it is either way rather than
  // leaving silence to mean private.
  it('says whether it is public', () => {
    build({ publiclyVisible: true });

    expect(text()).toContain('Public');

    build({ publiclyVisible: false });

    expect(text()).toContain('Private');
  });

  it('says when a moderator has hidden it', () => {
    build({ suppressed: true });

    expect(text()).toContain('Hidden by a moderator');

    build({ suppressed: false });

    expect(text()).not.toContain('Hidden by a moderator');
  });

  // A section's panel and the panel of a tab inside it sit a few lines apart,
  // and the colour is what tells them apart.
  it('takes the outer colour for a section', () => {
    build({ kind: 'section' });

    expect(component.isSection).toBe(true);
    expect(panel().classList).toContain('custom-tracking-info-bar--section');
  });

  it('takes the inner colour for a tab', () => {
    build({ kind: 'tab' });

    expect(component.isSection).toBe(false);
    expect(panel().classList).not.toContain(
      'custom-tracking-info-bar--section',
    );
  });

  // The controls differ between a section and a tab; where they sit does not.
  it('puts the projected controls at the far end', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();

    const actions: HTMLElement = host.nativeElement.querySelector(
      '.custom-tracking-info-bar__actions',
    );

    expect(actions.textContent).toContain('Move it');
  });
});
