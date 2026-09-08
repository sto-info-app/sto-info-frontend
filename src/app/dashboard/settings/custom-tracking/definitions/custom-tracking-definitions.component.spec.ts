import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, throwError } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingDefaultSource,
  CustomTrackingDeletionImpact,
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldCategory,
  CustomTrackingFieldType,
  CustomTrackingSectionTree,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { aConfiguration } from 'src/app/shared/custom-tracking/custom-tracking.testing';

import { CustomTrackingService } from '../custom-tracking.service';
import { CustomTrackingDefinitionsComponent } from './custom-tracking-definitions.component';

describe('CustomTrackingDefinitionsComponent', () => {
  const describedType = (
    fieldType: CustomTrackingFieldType,
    label: string,
    usesOptions = false,
    allowsMultipleOptions = false,
    allowsRequired = true,
  ) => ({
    fieldType,
    label,
    description: `A ${label.toLowerCase()}.`,
    category: CustomTrackingFieldCategory.TEXT,
    usesOptions,
    allowsMultipleOptions,
    defaultSource: CustomTrackingDefaultSource.NONE,
    usesTimezone: false,
    allowsRequired,
  });

  const configuration: CustomTrackingConfiguration = aConfiguration({
    fieldTypes: [
      describedType(
        CustomTrackingFieldType.TEXT_SINGLE_LINE,
        'Single line of text',
      ),
      describedType(CustomTrackingFieldType.DROPDOWN, 'Menu', true),
      describedType(CustomTrackingFieldType.TAGS, 'Tags', true, true),
    ],
    palette: [],
    limits: {
      MAX_SECTIONS_PER_SCOPE: 2,
      MAX_TABS_PER_SECTION: 2,
      MAX_FIELDS_PER_TAB: 2,
      MAX_FIELDS_PER_SCOPE: 4,
      MAX_FIELDS_PER_SCOPE_INCLUDING_DELETED: 8,
      MAX_LABEL_LENGTH: 100,
      MAX_DESCRIPTION_LENGTH: 500,
      MAX_TEXT_VALUE_LENGTH: 500,
      MAX_MARKDOWN_VALUE_LENGTH: 10000,
      MAX_OPTIONS_PER_FIELD: 50,
      MAX_TAGS_PER_VALUE: 50,
      MAX_TAG_LENGTH: 100,
      MAX_IMAGE_ALT_LENGTH: 300,
      MAX_PLACEHOLDER_LENGTH: 100,
    },
    fieldBounds: {
      RATING_MAXIMA: [3, 5, 10],
      MAX_DECIMAL_PRECISION: 6,
      MAX_NUMERIC_MAGNITUDE: 1000000000,
      MIN_YEAR: 1,
      MAX_YEAR: 9999,
      MAX_PATTERN_LENGTH: 200,
    },
  });

  const field = (
    id: string,
    name: string,
    overrides: Partial<CustomTrackingField> = {},
  ): CustomTrackingField => ({
    id,
    tabId: 'tab-1',
    fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
    name,
    description: null,
    orderIndex: 1000,
    publiclyVisible: false,
    required: false,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: null,
    configuration: {},
    suppressed: false,
    options: [],
    ...overrides,
  });

  const tree = (): CustomTrackingSectionTree[] => [
    {
      id: 'section-1',
      targetScope: CustomTrackingTargetScope.ACCOUNT,
      name: 'Ship collection',
      description: 'Everything I fly.',
      orderIndex: 1000,
      publiclyVisible: false,
      suppressed: false,
      tabs: [
        {
          id: 'tab-1',
          sectionId: 'section-1',
          name: 'Cruisers',
          description: null,
          orderIndex: 1000,
          publiclyVisible: false,
          suppressed: false,
          fields: [field('field-1', 'Class'), field('field-2', 'Registry')],
        },
        {
          id: 'tab-2',
          sectionId: 'section-1',
          name: 'Escorts',
          description: null,
          orderIndex: 2000,
          publiclyVisible: true,
          suppressed: false,
          fields: [],
        },
      ],
    },
    {
      id: 'section-2',
      targetScope: CustomTrackingTargetScope.ACCOUNT,
      name: 'Reputation',
      description: null,
      orderIndex: 2000,
      publiclyVisible: true,
      suppressed: false,
      tabs: [],
    },
  ];

  const impact: CustomTrackingDeletionImpact = {
    tabs: 2,
    fields: 2,
    values: 9,
  };

  let fixture: ComponentFixture<CustomTrackingDefinitionsComponent>;
  let component: CustomTrackingDefinitionsComponent;
  let service: Record<string, jest.Mock>;
  let dialogOpen: jest.Mock;
  let confirmed: boolean;

  const text = (): string => fixture.nativeElement.textContent as string;

  // Typed the way a user types it. The component is OnPush, so a programmatic
  // write would leave the list stale in the test while behaving correctly in a
  // browser.
  const typeSearch = (term: string): void => {
    const box: HTMLInputElement = fixture.nativeElement.querySelector(
      '#custom-tracking-search',
    );

    box.value = term;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const build = (): void => {
    fixture = TestBed.createComponent(CustomTrackingDefinitionsComponent);
    component = fixture.componentInstance;
    component.configuration = configuration;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    confirmed = true;

    const nothing = (): Observable<void> => of(undefined);

    service = {
      getDefinitions: jest.fn(() => of(tree())),
      createSection: jest.fn(() => of({ id: 'section-3' })),
      updateSection: jest.fn(() => of({ id: 'section-1' })),
      deleteSection: jest.fn(nothing),
      getSectionDeletionImpact: jest.fn(() => of(impact)),
      reorderSections: jest.fn(nothing),
      createTab: jest.fn(() => of({ id: 'tab-3' })),
      updateTab: jest.fn(() => of({ id: 'tab-1' })),
      deleteTab: jest.fn(nothing),
      getTabDeletionImpact: jest.fn(() => of(impact)),
      reorderTabs: jest.fn(nothing),
      createField: jest.fn(() => of({ id: 'field-3' })),
      updateField: jest.fn(() => of({ id: 'field-1' })),
      deleteField: jest.fn(nothing),
      getFieldDeletionImpact: jest.fn(() => of(impact)),
      reorderFields: jest.fn(nothing),
      createOption: jest.fn(() => of({ id: 'option-1' })),
      updateOption: jest.fn(() => of({ id: 'option-1' })),
      deleteOption: jest.fn(nothing),
      reorderOptions: jest.fn(nothing),
    };

    dialogOpen = jest.fn(() => ({ afterClosed: () => of(confirmed) }));

    await TestBed.configureTestingModule({
      imports: [CustomTrackingDefinitionsComponent],
      providers: [
        { provide: CustomTrackingService, useValue: service },
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    }).compileComponents();
  });

  describe('loading', () => {
    // The whole scope arrives at once because the search box searches all of
    // it, not only the branches somebody has opened.
    it('reads the whole scope in one request', () => {
      build();

      expect(service['getDefinitions']).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
      );
      expect(component.sections).toHaveLength(2);
      expect(component.isLoading).toBe(false);
    });

    it('reports a failure to load', () => {
      service['getDefinitions'].mockReturnValue(
        throwError(() => new Error('offline')),
      );

      build();

      expect(text()).toContain('Unable to load your custom tracking setup.');
    });

    it('says when a scope holds nothing yet', () => {
      service['getDefinitions'].mockReturnValue(of([]));

      build();

      expect(text()).toContain('Nothing is set up for your accounts yet');
    });

    it('reads the other scope when it is chosen', () => {
      build();

      component.chooseScope(CustomTrackingTargetScope.CHARACTER);

      expect(service['getDefinitions']).toHaveBeenLastCalledWith(
        CustomTrackingTargetScope.CHARACTER,
      );
      expect(component.scope).toBe(CustomTrackingTargetScope.CHARACTER);
    });

    it('reads nothing again when the scope in view is chosen', () => {
      build();

      component.chooseScope(CustomTrackingTargetScope.ACCOUNT);

      expect(service['getDefinitions']).toHaveBeenCalledTimes(1);
    });
  });

  describe('what it shows', () => {
    it('counts what is used against the published ceilings', () => {
      build();

      expect(component.fieldCount).toBe(2);
      expect(text()).toContain('2 of 2 sections');
      expect(text()).toContain('2 of 4 fields');
    });

    // A section belongs to one scope and cannot be moved to the other, so the
    // form that creates one says which it is about to create in.
    it('names the hierarchy a new section would belong to', () => {
      build();

      expect(component.scopeContext).toBe('for your accounts');

      component.chooseScope(CustomTrackingTargetScope.CHARACTER);

      expect(component.scopeContext).toBe('for your characters');
    });

    it('names a field type as the server named it', () => {
      build();

      expect(component.typeLabel(CustomTrackingFieldType.DROPDOWN)).toBe(
        'Menu',
      );
    });

    it('falls back to the stored name for a type the server did not describe', () => {
      build();

      expect(component.typeLabel(CustomTrackingFieldType.IMAGE)).toBe('IMAGE');
    });

    it('knows which types draw answers from a list', () => {
      build();

      expect(
        component.usesOptions(
          field('field-9', 'Class', {
            fieldType: CustomTrackingFieldType.DROPDOWN,
          }),
        ),
      ).toBe(true);
      expect(component.usesOptions(field('field-1', 'Class'))).toBe(false);
      expect(
        component.usesOptions(
          field('field-9', 'Picture', {
            fieldType: CustomTrackingFieldType.IMAGE,
          }),
        ),
      ).toBe(false);
    });

    it('knows which types take more than one answer', () => {
      build();

      expect(
        component.allowsMultipleOptions(
          field('field-9', 'Tags', {
            fieldType: CustomTrackingFieldType.TAGS,
          }),
        ),
      ).toBe(true);
      expect(
        component.allowsMultipleOptions(
          field('field-9', 'Class', {
            fieldType: CustomTrackingFieldType.DROPDOWN,
          }),
        ),
      ).toBe(false);
      expect(
        component.allowsMultipleOptions(
          field('field-9', 'Picture', {
            fieldType: CustomTrackingFieldType.IMAGE,
          }),
        ),
      ).toBe(false);
    });

    // A tag field draws from a list its owner defines for that field, so the
    // two are the same thing and only the wording differs.
    it('calls a tag a tag and everything else a choice', () => {
      build();

      expect(
        component.optionNoun(
          field('field-9', 'Tags', {
            fieldType: CustomTrackingFieldType.TAGS,
          }),
        ),
      ).toBe('tag');
      expect(
        component.optionNoun(
          field('field-9', 'Class', {
            fieldType: CustomTrackingFieldType.DROPDOWN,
          }),
        ),
      ).toBe('choice');
    });

    // Somebody arriving at the builder came to see what they have built, not
    // to open ten panels before they can read any of it.
    it('opens every section, and folds one away when asked', () => {
      build();

      expect(component.isExpanded('section-1')).toBe(true);

      component.toggle('section-1');

      expect(component.isExpanded('section-1')).toBe(false);

      component.toggle('section-1');

      expect(component.isExpanded('section-1')).toBe(true);
    });

    // Edit sits on the panel's bar, which is visible whether or not the panel
    // is open. The form it summons is inside the panel, which is not.
    it('opens a section when its editor is asked for', () => {
      build();

      component.toggle('section-1');
      component.editSection(component.sections[0]);

      expect(component.isExpanded('section-1')).toBe(true);
    });

    it('opens the section holding a tab and brings that tab forward', () => {
      build();

      component.toggle('section-1');
      component.showTab('section-1', 'tab-2');
      component.editTab(component.sections[0].tabs[0]);

      expect(component.isExpanded('section-1')).toBe(true);
      expect(component.activeTab(component.sections[0])?.id).toBe('tab-1');
    });

    it('opens everything above a field', () => {
      build();

      component.toggle('section-1');
      component.showTab('section-1', 'tab-2');
      component.editField(
        component.sections[0].id,
        component.sections[0].tabs[0].fields[0],
      );

      expect(component.isExpanded('section-1')).toBe(true);
      expect(component.activeTab(component.sections[0])?.id).toBe('tab-1');
    });

    // The tabs of a section are alternatives to one another, so one set of
    // fields is shown at a time and the first until somebody says otherwise.
    it('shows the first tab of a section until another is chosen', () => {
      build();

      expect(component.activeTab(component.sections[0])?.id).toBe('tab-1');

      component.showTab('section-1', 'tab-2');

      expect(component.activeTab(component.sections[0])?.id).toBe('tab-2');
    });

    it('falls back to the first tab where the chosen one is not shown', () => {
      build();

      component.showTab('section-1', 'gone');

      expect(component.activeTab(component.sections[0])?.id).toBe('tab-1');
    });

    it('has no tab to show for a section holding none', () => {
      build();

      expect(component.activeTab(component.sections[1])).toBeNull();
    });

    it('forgets which tabs were showing when the scope changes', () => {
      build();

      component.showTab('section-1', 'tab-2');
      component.chooseScope(CustomTrackingTargetScope.CHARACTER);

      expect(component.activeTabs).toEqual({});
    });

    // A row of tabs is one stop in the tab order rather than one stop per tab.
    it('moves between a section tabs with the arrow keys, and focus follows', () => {
      build();

      const first: HTMLButtonElement = fixture.nativeElement.querySelector(
        '#custom-tracking-definition-tab-tab-1',
      );

      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      fixture.detectChanges();

      expect(component.activeTabs['section-1']).toBe('tab-2');
      expect(document.activeElement?.id).toBe(
        'custom-tracking-definition-tab-tab-2',
      );
    });

    it('leaves keys that mean nothing in a row of tabs alone', () => {
      build();

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });

      component.onTabKeydown(event, component.sections[0]);

      expect(component.activeTabs['section-1']).toBeUndefined();
      expect(event.defaultPrevented).toBe(false);
    });

    it('counts what a tab holds in words', () => {
      build();

      expect(component.fieldSummary('tab-1')).toBe('2 fields');
      expect(component.fieldSummary('tab-2')).toBe('0 fields');

      service['getDefinitions'].mockReturnValue(
        of([
          {
            ...tree()[0],
            tabs: [
              { ...tree()[0].tabs[0], fields: [field('field-1', 'Class')] },
            ],
          },
        ]),
      );
      build();

      expect(component.fieldSummary('tab-1')).toBe('1 field');
    });

    // Leaving a match folded away would report a hit and then hide it.
    it('opens everything a search matched', () => {
      build();

      component.toggle('section-1');
      component.search.setValue('registry');

      expect(component.isSearching).toBe(true);
      expect(component.isExpanded('section-1')).toBe(true);
      expect(component.visibleSections).toHaveLength(1);
    });

    it('says when a search matched nothing', () => {
      build();

      typeSearch('transwarp');

      expect(text()).toContain('Nothing here mentions that');
    });
  });

  describe('the ceilings', () => {
    it('stops offering another section once the scope is full', () => {
      build();

      expect(component.canAddSection).toBe(false);
      expect(text()).toContain('as many sections as this scope allows');
    });

    it('stops offering another tab once a section is full', () => {
      build();

      expect(component.canAddTab('section-1')).toBe(false);
      expect(component.canAddTab('section-2')).toBe(true);
    });

    it('stops offering another field once a tab is full', () => {
      build();

      expect(component.canAddField('tab-1')).toBe(false);
      expect(component.canAddField('tab-2')).toBe(true);
    });

    // The tab has room; the scope does not, and the scope decides.
    it('stops offering another field anywhere once the scope is full', () => {
      service['getDefinitions'].mockReturnValue(
        of([
          {
            ...tree()[0],
            tabs: [
              { ...tree()[0].tabs[0] },
              {
                ...tree()[0].tabs[1],
                fields: [
                  field('field-3', 'Shields', { tabId: 'tab-2' }),
                  field('field-4', 'Hull', { tabId: 'tab-2' }),
                ],
              },
            ],
          },
        ]),
      );

      build();

      expect(component.isScopeFull).toBe(true);
      expect(component.canAddField('tab-2')).toBe(false);
      expect(text()).toContain('no more can be added anywhere in it');
    });

    it('counts nothing for a tab or section that is no longer there', () => {
      build();

      expect(component.tabCount('gone')).toBe(0);
      expect(component.fieldCountIn('gone')).toBe(0);
      expect(component.sourceSection('gone')).toBeNull();
      expect(component.sourceTab('gone')).toBeNull();
    });
  });

  describe('opening a form', () => {
    it('opens an empty form for each kind of thing', () => {
      build();

      component.addSection();

      expect(component.editor).toEqual({
        kind: 'section',
        parentId: '',
        id: null,
      });

      component.addTab(component.sections[0]);

      expect(component.editor).toEqual({
        kind: 'tab',
        parentId: 'section-1',
        id: null,
      });

      component.addField(component.sections[0].tabs[0]);

      expect(component.editor).toEqual({
        kind: 'field',
        parentId: 'tab-1',
        id: null,
      });
    });

    it('opens a filled-in form for each kind of thing', () => {
      build();

      component.editSection(component.sections[0]);

      expect(component.editingSection?.id).toBe('section-1');

      component.editTab(component.sections[0].tabs[0]);

      expect(component.editingTab?.id).toBe('tab-1');

      component.editField(
        component.sections[0].id,
        component.sections[0].tabs[0].fields[0],
      );

      expect(component.editingField?.id).toBe('field-1');
    });

    it('holds nothing open when nothing is being edited', () => {
      build();

      expect(component.editingSection).toBeNull();
      expect(component.editingTab).toBeNull();
      expect(component.editingField).toBeNull();
    });

    // A form can outlive what it was opened on: something deleted in another
    // window is gone from the next load, and the form has to close rather than
    // show a section that is no longer there.
    it('holds nothing open for something that is no longer there', () => {
      build();

      component.editor = { kind: 'section', parentId: '', id: 'gone' };

      expect(component.editingSection).toBeNull();

      component.editor = { kind: 'tab', parentId: 'section-1', id: 'gone' };

      expect(component.editingTab).toBeNull();

      component.editor = { kind: 'field', parentId: 'tab-1', id: 'gone' };

      expect(component.editingField).toBeNull();
    });

    it('closes whatever is open', () => {
      build();

      component.addSection();
      component.closeEditor();

      expect(component.editor).toBeNull();
    });

    it('closes the form when the scope changes', () => {
      build();

      component.addSection();
      component.chooseScope(CustomTrackingTargetScope.CHARACTER);

      expect(component.editor).toBeNull();
    });

    // A tab public beneath a private section stays private, and the form has
    // to be able to say so.
    it('knows whether everything above the form is public', () => {
      build();

      component.editTab(component.sections[0].tabs[0]);

      expect(component.editorAncestorPublic).toBe(false);

      component.editField(
        component.sections[0].id,
        component.sections[0].tabs[0].fields[0],
      );

      expect(component.editorAncestorPublic).toBe(false);
    });

    it('treats a missing ancestor as no obstacle', () => {
      build();

      component.editor = { kind: 'field', parentId: 'gone', id: null };

      expect(component.editorAncestorPublic).toBe(true);

      component.editor = { kind: 'tab', parentId: 'gone', id: null };

      expect(component.editorAncestorPublic).toBe(true);
    });
  });

  describe('saving', () => {
    const input = {
      name: 'Ship collection',
      description: null,
      publiclyVisible: false,
    };

    it('creates a section in the scope being built', () => {
      build();

      component.addSection();
      component.saveGroup(input);

      expect(service['createSection']).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        input,
      );
      expect(component.editor).toBeNull();
    });

    it('changes a section that already exists', () => {
      build();

      component.editSection(component.sections[0]);
      component.saveGroup(input);

      expect(service['updateSection']).toHaveBeenCalledWith('section-1', input);
    });

    it('creates a tab in the section it was opened from', () => {
      build();

      component.addTab(component.sections[0]);
      component.saveGroup(input);

      expect(service['createTab']).toHaveBeenCalledWith('section-1', input);
    });

    it('changes a tab that already exists', () => {
      build();

      component.editTab(component.sections[0].tabs[0]);
      component.saveGroup(input);

      expect(service['updateTab']).toHaveBeenCalledWith('tab-1', input);
    });

    it('creates a field in the tab it was opened from', () => {
      build();

      component.addField(component.sections[0].tabs[0]);
      component.saveField({ name: 'Class' });

      expect(service['createField']).toHaveBeenCalledWith('tab-1', {
        name: 'Class',
      });
    });

    it('changes a field that already exists', () => {
      build();

      component.editField(
        component.sections[0].id,
        component.sections[0].tabs[0].fields[0],
      );
      component.saveField({ name: 'Class' });

      expect(service['updateField']).toHaveBeenCalledWith('field-1', {
        name: 'Class',
      });
    });

    it('saves nothing when no form is open', () => {
      build();

      component.saveGroup(input);
      component.saveField({ name: 'Class' });

      expect(service['createSection']).not.toHaveBeenCalled();
      expect(service['createField']).not.toHaveBeenCalled();
    });

    // The server renumbers orders, refuses duplicate names and normalises
    // configuration, so what it says afterwards is what is true.
    it('reads the hierarchy again once a change lands', () => {
      build();

      component.addSection();
      component.saveGroup(input);

      expect(service['getDefinitions']).toHaveBeenCalledTimes(2);
    });

    it('reports what the server said when it refused', () => {
      build();

      service['createSection'].mockReturnValue(
        throwError(() => ({
          error: { message: 'That name is already used.' },
        })),
      );

      component.addSection();
      component.saveGroup(input);
      fixture.detectChanges();

      expect(text()).toContain('That name is already used.');
    });
  });

  describe('deleting', () => {
    // "Delete this section" and "delete this section, two tabs, two fields and
    // nine recorded answers" are different decisions.
    it('asks what would go before asking whether to delete a section', () => {
      build();

      component.removeSection(component.sections[0]);

      expect(service['getSectionDeletionImpact']).toHaveBeenCalledWith(
        'section-1',
      );
      expect(dialogOpen).toHaveBeenCalled();
      expect(service['deleteSection']).toHaveBeenCalledWith('section-1');
    });

    it('asks what would go before asking whether to delete a tab', () => {
      build();

      component.removeTab(component.sections[0].tabs[0]);

      expect(service['getTabDeletionImpact']).toHaveBeenCalledWith('tab-1');
      expect(service['deleteTab']).toHaveBeenCalledWith('tab-1');
    });

    it('asks how many answers would go before deleting a field', () => {
      build();

      component.removeField(component.sections[0].tabs[0].fields[0]);

      expect(service['getFieldDeletionImpact']).toHaveBeenCalledWith('field-1');
      expect(service['deleteField']).toHaveBeenCalledWith('field-1');
    });

    it('deletes nothing when the question is answered no', () => {
      confirmed = false;

      build();

      component.removeSection(component.sections[0]);

      expect(service['deleteSection']).not.toHaveBeenCalled();
    });

    // Deleting without being able to say what would go is worse than not
    // deleting at all.
    it('deletes nothing when the counts cannot be read', () => {
      build();

      service['getSectionDeletionImpact'].mockReturnValue(
        throwError(() => new Error('offline')),
      );

      component.removeSection(component.sections[0]);
      fixture.detectChanges();

      expect(dialogOpen).not.toHaveBeenCalled();
      expect(service['deleteSection']).not.toHaveBeenCalled();
      expect(text()).toContain('so nothing has been deleted');
    });
  });

  describe('reordering', () => {
    // A complete list either describes the collection exactly or does not, and
    // the server says which.
    it('sends the whole order of the sections', () => {
      build();

      component.reorderSections(1, 0);

      expect(service['reorderSections']).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        ['section-2', 'section-1'],
      );
    });

    it('sends the whole order of a section tabs', () => {
      build();

      component.reorderTabs('section-1', 0, 1);

      expect(service['reorderTabs']).toHaveBeenCalledWith('section-1', [
        'tab-2',
        'tab-1',
      ]);
    });

    // Until a tab is chosen outright the strip shows whichever is first, so
    // moving the first tab along used to leave a different tab's fields on the
    // screen — as though the arrow had swapped the contents, not the order.
    it('keeps the moved tab the one showing', () => {
      build();

      expect(component.activeTabs['section-1']).toBeUndefined();

      component.reorderTabs('section-1', 0, 1);

      expect(component.activeTabs['section-1']).toBe('tab-1');
    });

    it('leaves the showing tab alone when the move went nowhere', () => {
      build();

      component.showTab('section-1', 'tab-2');
      component.reorderTabs('gone', 0, 1);

      expect(component.activeTabs['section-1']).toBe('tab-2');
    });

    it('sends the whole order of a tab fields', () => {
      build();

      component.reorderFields('tab-1', 0, 1);

      expect(service['reorderFields']).toHaveBeenCalledWith('tab-1', [
        'field-2',
        'field-1',
      ]);
    });

    it('sends nothing for a collection that is no longer there', () => {
      build();

      component.reorderTabs('gone', 0, 1);
      component.reorderFields('gone', 0, 1);

      expect(service['reorderTabs']).toHaveBeenCalledWith('gone', []);
      expect(service['reorderFields']).toHaveBeenCalledWith('gone', []);
    });

    // A search shows a subset, and moving the second of two visible tabs when
    // the section really holds nine would send an order describing nothing.
    it('reorders against the whole hierarchy, not what a search is showing', () => {
      build();

      component.search.setValue('escorts');

      expect(component.tabPosition(component.sections[0].tabs[1])).toBe(1);
      expect(component.sectionPosition('section-2')).toBe(1);
      expect(
        component.fieldPosition(component.sections[0].tabs[0].fields[1]),
      ).toBe(1);
    });

    it('reports nothing for a position that no longer exists', () => {
      build();

      expect(
        component.tabPosition({
          ...component.sections[0].tabs[0],
          id: 'gone',
          sectionId: 'gone',
        }),
      ).toBe(-1);
      expect(
        component.fieldPosition(field('gone', 'Gone', { tabId: 'gone' })),
      ).toBe(-1);
    });
  });

  describe('the answers a choice field offers', () => {
    const chooser = () =>
      field('field-1', 'Class', {
        fieldType: CustomTrackingFieldType.DROPDOWN,
      });

    it('adds one', () => {
      build();

      component.addOption(chooser(), 'Escort');

      expect(service['createOption']).toHaveBeenCalledWith('field-1', {
        label: 'Escort',
        isDefault: false,
      });
    });

    it('rewords one without replacing it', () => {
      build();

      component.renameOption({ optionId: 'option-1', label: 'Escort carrier' });

      expect(service['updateOption']).toHaveBeenCalledWith('option-1', {
        label: 'Escort carrier',
      });
    });

    it('turns a default on', () => {
      build();

      component.setOptionDefault({ optionId: 'option-1', isDefault: true });

      expect(service['updateOption']).toHaveBeenCalledWith('option-1', {
        isDefault: true,
      });
    });

    // Always soft: a value that already chose it keeps reading correctly, and
    // only new selections are refused.
    it('withdraws one without asking', () => {
      build();

      component.withdrawOption({
        id: 'option-1',
        fieldId: 'field-1',
        label: 'Escort',
        orderIndex: 1000,
        isDefault: false,
        withdrawn: false,
      });

      expect(dialogOpen).not.toHaveBeenCalled();
      expect(service['deleteOption']).toHaveBeenCalledWith('option-1');
    });

    it('sends the whole order of them', () => {
      build();

      component.reorderOptions(chooser(), ['option-2', 'option-1']);

      expect(service['reorderOptions']).toHaveBeenCalledWith('field-1', [
        'option-2',
        'option-1',
      ]);
    });
  });
});
