import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingPolicyStatus,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingService } from './custom-tracking.service';
import { CustomTrackingSettingsComponent } from './custom-tracking-settings.component';

describe('CustomTrackingSettingsComponent', () => {
  const configuration = {
    features: {
      isEnabled: true,
      publicReadEnabled: true,
      definitionEditingEnabled: true,
      valueEditingEnabled: true,
      imagesEnabled: true,
      youTubeEnabled: true,
    },
    fieldTypes: [],
    palette: [],
    limits: {
      MAX_SECTIONS_PER_SCOPE: 10,
      MAX_FIELDS_PER_SCOPE: 200,
    },
    fieldBounds: { RATING_MAXIMA: [3, 5, 10] },
  } as unknown as CustomTrackingConfiguration;

  const accepted: CustomTrackingPolicyStatus = {
    currentVersion: '1.0',
    effectiveDate: '2026-09-04',
    updatedDate: '2026-09-04',
    acceptedVersion: '1.0',
    acceptedAt: '2026-09-04T10:00:00.000Z',
    acceptanceRequired: false,
  };

  let fixture: ComponentFixture<CustomTrackingSettingsComponent>;
  let component: CustomTrackingSettingsComponent;
  let service: Record<string, jest.Mock>;

  const text = (): string => fixture.nativeElement.textContent as string;

  const tabs = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));

  const build = (): void => {
    fixture = TestBed.createComponent(CustomTrackingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    service = {
      getConfiguration: jest.fn(() => of(configuration)),
      getPolicyStatus: jest.fn(() => of(accepted)),
      getAgreement: jest.fn(() =>
        of({
          version: '1.0',
          effectiveDate: '2026-09-04',
          updatedDate: '2026-09-04',
          title: 'Custom Tracking Content Agreement',
          sections: [],
        }),
      ),
      acceptPolicy: jest.fn(() => of(accepted)),
      getDefinitions: jest.fn(() => of([])),
      getTargets: jest.fn(() => of([])),
    };

    await TestBed.configureTestingModule({
      imports: [CustomTrackingSettingsComponent, RouterModule.forRoot([])],
      providers: [
        { provide: CustomTrackingService, useValue: service },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    }).compileComponents();
  });

  // Neither is any use on its own: the page cannot be drawn without the
  // catalogue, and it must not offer to create anything before the agreement
  // has been accepted.
  it('reads the feature and the acceptance together', () => {
    build();

    expect(service['getConfiguration']).toHaveBeenCalled();
    expect(service['getPolicyStatus']).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('reports a failure to load either', () => {
    service['getPolicyStatus'].mockReturnValue(
      throwError(() => new Error('offline')),
    );

    build();

    expect(text()).toContain('Unable to load Custom Tracking.');
  });

  // Switched off is not the same as gone, and a user seeing an empty page
  // deserves to be told which.
  it('says when the feature is switched off, and that nothing is lost', () => {
    service['getConfiguration'].mockReturnValue(
      of({
        ...configuration,
        features: { ...configuration.features, isEnabled: false },
      }),
    );

    build();

    expect(component.isEnabled).toBe(false);
    expect(text()).toContain('switched off at the moment');
    expect(text()).toContain('untouched');
    expect(tabs()).toEqual([]);
  });

  it('puts the agreement in the way until it has been accepted', () => {
    service['getPolicyStatus'].mockReturnValue(
      of({ ...accepted, acceptanceRequired: true }),
    );

    build();

    expect(component.needsAgreement).toBe(true);
    expect(text()).toContain('Custom Tracking Content Agreement');
    expect(tabs()).toEqual([]);
  });

  // Accepted the way a user accepts it, through the panel the page embeds.
  it('lets the builder through once the agreement is accepted', () => {
    service['getPolicyStatus'].mockReturnValue(
      of({ ...accepted, acceptanceRequired: true }),
    );

    build();

    const tickBox: HTMLInputElement = fixture.nativeElement.querySelector(
      '#custom-tracking-agreed',
    );
    tickBox.click();
    fixture.detectChanges();

    const agree: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );
    agree.click();
    fixture.detectChanges();

    expect(service['acceptPolicy']).toHaveBeenCalledWith('1.0');
    expect(component.needsAgreement).toBe(false);
    expect(tabs()).toHaveLength(3);
  });

  it('opens on the builder', () => {
    build();

    expect(component.panel).toBe('definitions');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('shows the other panels when their tabs are pressed', () => {
    build();

    tabs()[1].click();
    fixture.detectChanges();

    expect(component.panel).toBe('values');
    expect(text()).toContain('You have no accounts to record against yet');

    tabs()[2].click();
    fixture.detectChanges();

    expect(component.panel).toBe('about');
    expect(text()).toContain('What this is');
  });

  // A row of tabs is one stop in the tab order rather than one stop per tab.
  it('keeps only the chosen tab in the tab order', () => {
    build();

    expect(tabs().map(tab => tab.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });

  it('moves between the tabs with the arrow keys, and focus follows', () => {
    build();

    tabs()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    fixture.detectChanges();

    expect(component.panel).toBe('values');
    expect(document.activeElement).toBe(tabs()[1]);

    tabs()[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    fixture.detectChanges();

    expect(component.panel).toBe('definitions');
  });

  // A row of two tabs that refuses to go right from the last one just feels
  // broken.
  it('wraps around at the ends', () => {
    build();

    component.show('about');
    tabs()[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );

    expect(component.panel).toBe('definitions');
  });

  it('jumps to the first and last tabs', () => {
    build();

    tabs()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );

    expect(component.panel).toBe('about');

    tabs()[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );

    expect(component.panel).toBe('definitions');
  });

  it('leaves every other key alone', () => {
    build();

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    tabs()[0].dispatchEvent(event);

    expect(component.panel).toBe('definitions');
    expect(event.defaultPrevented).toBe(false);
  });

  it('says what happens to deleted definitions and for how long', () => {
    build();

    component.show('about');
    fixture.detectChanges();

    expect(text()).toContain('180 days');
  });

  // Only the value editor holds unsaved work, and only once it is on the
  // screen — so a page nobody has recorded anything on never stands in the way
  // of leaving.
  it('reports unsaved work only where the value editor holds some', () => {
    build();

    expect(component.hasUnsavedChanges()).toBe(false);

    jest.spyOn(component.values!, 'hasUnsavedChanges').mockReturnValue(true);

    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('has nothing unsaved before the page has loaded', () => {
    service['getConfiguration'].mockReturnValue(
      throwError(() => new Error('no')),
    );
    build();

    expect(component.values).toBeUndefined();
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('offers a way back to Settings', () => {
    build();

    const back: HTMLAnchorElement =
      fixture.nativeElement.querySelector('a.lcars-btn');

    expect(back.textContent).toContain('Back to Settings');
  });
});
