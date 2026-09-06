import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  CustomTrackingEmptyMode,
  CustomTrackingFieldType,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingConfigurationService } from '../custom-tracking-configuration.service';
import {
  CustomTrackingDisplaySection,
  CustomTrackingDisplayTab,
} from '../custom-tracking-display.models';
import { aConfiguration } from '../custom-tracking.testing';
import { CustomTrackingDisplayComponent } from './custom-tracking-display.component';

describe('CustomTrackingDisplayComponent', () => {
  let fixture: ComponentFixture<CustomTrackingDisplayComponent>;
  let component: CustomTrackingDisplayComponent;
  let getConfiguration: jest.Mock;

  const aTab = (
    id: string,
    name: string,
    fieldName = 'Ship name',
  ): CustomTrackingDisplayTab => ({
    id,
    name,
    description: null,
    fields: [
      {
        id: `field-${id}`,
        fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
        name: fieldName,
        description: null,
        configuration: {},
        emptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
        emptyPlaceholder: null,
        value: { text: 'Bellerophon' },
        chosen: [],
        image: null,
        answered: true,
      },
    ],
  });

  const aSection = (
    tabs: CustomTrackingDisplayTab[],
    overrides: Partial<CustomTrackingDisplaySection> = {},
  ): CustomTrackingDisplaySection => ({
    id: 'section-1',
    name: 'Fleet duties',
    description: 'What they owe the fleet',
    tabs,
    ...overrides,
  });

  const build = (sections: CustomTrackingDisplaySection[]): void => {
    fixture = TestBed.createComponent(CustomTrackingDisplayComponent);
    component = fixture.componentInstance;
    component.sections = sections;
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  const query = <T extends HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null;

  const queryAll = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector) as T[]);

  beforeEach(async () => {
    getConfiguration = jest.fn(() => of(aConfiguration()));

    await TestBed.configureTestingModule({
      imports: [CustomTrackingDisplayComponent],
      providers: [
        {
          provide: CustomTrackingConfigurationService,
          useValue: { getConfiguration },
        },
      ],
    }).compileComponents();
  });

  // A member who has published none of their own information and one who has
  // published some and kept it private have to look identical from outside.
  it('draws nothing at all where nothing was permitted', () => {
    build([]);

    expect(query('.custom-tracking-display')).toBeNull();
    expect(getConfiguration).not.toHaveBeenCalled();
  });

  it('shows each section, its tab and the answers inside', () => {
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    expect(text()).toContain('Fleet duties');
    expect(text()).toContain('What they owe the fleet');
    expect(text()).toContain('Bellerophon');
  });

  // The block sits at the bottom of a page somebody has already scrolled, so
  // arriving closed would make it look as though there were nothing there.
  it('opens every section to begin with', () => {
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    expect(component.isOpen('section-1')).toBe(true);
    expect(query('.custom-tracking-panel-body')?.hidden).toBe(false);
  });

  it('closes a section when its heading is pressed, and opens it again', () => {
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    query<HTMLButtonElement>('.custom-tracking-panel-toggle')?.click();
    fixture.detectChanges();

    expect(query('.custom-tracking-panel-body')?.hidden).toBe(true);

    query<HTMLButtonElement>('.custom-tracking-panel-toggle')?.click();
    fixture.detectChanges();

    expect(query('.custom-tracking-panel-body')?.hidden).toBe(false);
  });

  // One tab is not a choice, and a row of one button is a control that does
  // nothing but take up room.
  it('offers no tab row for a section with a single tab', () => {
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    expect(query('[role="tablist"]')).toBeNull();
    expect(text()).toContain('Bellerophon');
  });

  it('shows the first tab of a section that has several', () => {
    build([
      aSection([
        aTab('tab-1', 'Provisioning', 'Ship name'),
        aTab('tab-2', 'Duties', 'Duty'),
      ]),
    ]);

    expect(queryAll('[role="tab"]')).toHaveLength(2);
    expect(queryAll('[role="tabpanel"]')[0].hidden).toBe(false);
    expect(queryAll('[role="tabpanel"]')[1].hidden).toBe(true);
  });

  it('switches tabs when one is pressed', () => {
    build([
      aSection([
        aTab('tab-1', 'Provisioning', 'Ship name'),
        aTab('tab-2', 'Duties', 'Duty'),
      ]),
    ]);

    queryAll<HTMLButtonElement>('[role="tab"]')[1].click();
    fixture.detectChanges();

    expect(queryAll('[role="tabpanel"]')[1].hidden).toBe(false);
    expect(queryAll('[role="tab"]')[1].getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('moves between tabs with the arrow keys', () => {
    build([
      aSection([
        aTab('tab-1', 'Provisioning'),
        aTab('tab-2', 'Duties'),
        aTab('tab-3', 'Ships'),
      ]),
    ]);

    const section = component.sections[0];

    component.onTabKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      section,
    );
    expect(component.activeTab(section)?.id).toBe('tab-2');

    component.onTabKeydown(
      new KeyboardEvent('keydown', { key: 'End' }),
      section,
    );
    expect(component.activeTab(section)?.id).toBe('tab-3');

    component.onTabKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      section,
    );
    expect(component.activeTab(section)?.id).toBe('tab-1');
  });

  it('leaves a key it does not handle to the browser', () => {
    build([aSection([aTab('tab-1', 'Provisioning'), aTab('tab-2', 'Duties')])]);

    const event = new KeyboardEvent('keydown', { key: 'a' });
    const prevented = jest.spyOn(event, 'preventDefault');

    component.onTabKeydown(event, component.sections[0]);

    expect(prevented).not.toHaveBeenCalled();
    expect(component.activeTab(component.sections[0])?.id).toBe('tab-1');
  });

  it('puts the focus on the tab the arrow keys chose', () => {
    jest.useFakeTimers();
    build([aSection([aTab('tab-1', 'Provisioning'), aTab('tab-2', 'Duties')])]);

    component.onTabKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      component.sections[0],
    );
    fixture.detectChanges();
    jest.runAllTimers();

    expect(document.activeElement?.id).toBe(
      'custom-tracking-display-tab-tab-2',
    );
    jest.useRealTimers();
  });

  it('reports no tab for a section that has none', () => {
    build([aSection([])]);

    expect(component.activeTab(component.sections[0])).toBeNull();
  });

  // Two of these on one page would otherwise share element identifiers, which
  // is exactly what the headings and tabs use to point at their panels.
  it('names its elements after the prefix it was given', () => {
    fixture = TestBed.createComponent(CustomTrackingDisplayComponent);
    component = fixture.componentInstance;
    component.sections = [aSection([aTab('tab-1', 'Provisioning')])];
    component.idPrefix = 'registry-account-custom';
    fixture.detectChanges();

    expect(query('.custom-tracking-panel-body')?.id).toBe(
      'registry-account-custom-section-section-1',
    );
  });

  it('asks the server for the palette and the picture shapes', () => {
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    expect(getConfiguration).toHaveBeenCalled();
    expect(component.configuration).not.toBeNull();
  });

  // Losing the configuration costs a colour its swatch and a picture its
  // address. An error bar about that on somebody's captain page would be
  // alarming out of all proportion to what is missing.
  it('says nothing when the configuration cannot be fetched', () => {
    getConfiguration.mockReturnValue(throwError(() => new Error('no')));
    build([aSection([aTab('tab-1', 'Provisioning')])]);

    expect(component.configuration).toBeNull();
    expect(text()).toContain('Bellerophon');
  });
});
