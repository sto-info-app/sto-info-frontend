import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingRecord,
  CustomTrackingSectionTree,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingService } from '../custom-tracking.service';
import {
  aConfiguration,
  aField,
  anAnswer,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';
import { CustomTrackingValuesComponent } from './custom-tracking-values.component';

describe('CustomTrackingValuesComponent', () => {
  const target = {
    scope: CustomTrackingTargetScope.ACCOUNT,
    id: 'target-1',
    label: '@kolan',
    publiclyVisible: false,
  };
  const otherTarget = { ...target, id: 'target-2', label: '@sela' };

  const section = (
    overrides: Partial<CustomTrackingSectionTree> = {},
  ): CustomTrackingSectionTree => ({
    id: 'section-1',
    targetScope: CustomTrackingTargetScope.ACCOUNT,
    name: 'Fleet',
    description: 'Where I stand in the fleet.',
    orderIndex: 1000,
    publiclyVisible: false,
    suppressed: false,
    tabs: [
      {
        id: 'tab-1',
        sectionId: 'section-1',
        name: 'Standing',
        description: 'How things are going.',
        orderIndex: 1000,
        publiclyVisible: false,
        suppressed: false,
        fields: [aField({ id: 'field-1', name: 'Ship name' })],
      },
    ],
    ...overrides,
  });

  const record = (
    overrides: Partial<CustomTrackingRecord> = {},
  ): CustomTrackingRecord => ({
    target,
    sections: [section()],
    answers: [],
    ...overrides,
  });

  let fixture: ComponentFixture<CustomTrackingValuesComponent>;
  let component: CustomTrackingValuesComponent;
  let getTargets: jest.Mock;
  let getRecord: jest.Mock;
  let saveRecord: jest.Mock;
  let open: jest.Mock;

  const text = (): string => fixture.nativeElement.textContent as string;

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const queryAll = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const buttonSaying = (label: string): HTMLButtonElement =>
    queryAll<HTMLButtonElement>('button').filter(button =>
      (button.textContent ?? '').includes(label),
    )[0];

  const build = (configuration = aConfiguration()): void => {
    fixture = TestBed.createComponent(CustomTrackingValuesComponent);
    component = fixture.componentInstance;
    component.configuration = configuration;
    fixture.detectChanges();
  };

  const typeInto = (selector: string, value: string): void => {
    const input = query<HTMLInputElement>(selector);

    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    getTargets = jest.fn().mockReturnValue(of([target, otherTarget]));
    getRecord = jest.fn().mockReturnValue(of(record()));
    saveRecord = jest.fn().mockReturnValue(of(record()));
    open = jest.fn().mockReturnValue({ afterClosed: () => of(true) });

    await TestBed.configureTestingModule({
      imports: [CustomTrackingValuesComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open } },
        {
          provide: CustomTrackingService,
          useValue: { getTargets, getRecord, saveRecord },
        },
      ],
    }).compileComponents();
  });

  describe('coming back to this panel', () => {
    it('reads the record again, because it may have been defined since', () => {
      build();
      getRecord.mockClear();

      component.active = true;

      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
      );
    });

    it('reads the records again where none was open to come back to', () => {
      getTargets.mockReturnValue(of([]));
      build();
      getTargets.mockClear();

      component.active = true;

      expect(getTargets).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
      );
    });

    it('leaves half-filled work alone', () => {
      build();
      typeInto('input[type="text"]', 'Adamant');
      getRecord.mockClear();

      component.active = true;

      expect(getRecord).not.toHaveBeenCalled();
    });

    it('does nothing when the panel is leaving rather than arriving', () => {
      build();
      getRecord.mockClear();

      component.active = false;

      expect(getRecord).not.toHaveBeenCalled();
    });

    // Angular sets inputs before it calls ngOnInit, so the panel can be told
    // it is in front before it has read anything at all.
    it('does nothing before the first read has happened', () => {
      fixture = TestBed.createComponent(CustomTrackingValuesComponent);
      component = fixture.componentInstance;
      component.configuration = aConfiguration();

      component.active = true;

      expect(getRecord).not.toHaveBeenCalled();
      expect(getTargets).not.toHaveBeenCalled();
    });
  });

  describe('choosing what to fill in', () => {
    it('opens on the first record it is offered', () => {
      build();

      expect(getTargets).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
      );
      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
      );
      expect(component.targetId).toBe('target-1');
    });

    it('says so where there is nothing to record against', () => {
      getTargets.mockReturnValue(of([]));
      build();

      expect(text()).toContain('You have no accounts');
      expect(getRecord).not.toHaveBeenCalled();
    });

    it('says so when the records could not be read', () => {
      getTargets.mockReturnValue(throwError(() => new Error('no')));
      build();

      expect(text()).toContain('Unable to load your accounts and characters');
    });

    it('says so when a record could not be read', () => {
      getRecord.mockReturnValue(throwError(() => new Error('no')));
      build();

      expect(text()).toContain('Unable to load that record');
    });

    it('changes scope and reads that scope instead', () => {
      build();

      buttonSaying('Characters').click();
      fixture.detectChanges();

      expect(component.scope).toBe(CustomTrackingTargetScope.CHARACTER);
      expect(getTargets).toHaveBeenLastCalledWith(
        CustomTrackingTargetScope.CHARACTER,
      );
      expect(component.scopeNoun).toBe('characters');
    });

    it('does nothing where the scope chosen is the one already showing', () => {
      build();
      getTargets.mockClear();

      buttonSaying('Accounts').click();

      expect(getTargets).not.toHaveBeenCalled();
    });

    it('opens whichever record was chosen', () => {
      build();

      const select = query<HTMLSelectElement>('#custom-tracking-target');

      select.value = 'target-2';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(getRecord).toHaveBeenLastCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-2',
      );
    });

    it('does nothing where the record chosen is the one already open', () => {
      build();
      getRecord.mockClear();

      component.chooseTarget('target-1');

      expect(getRecord).not.toHaveBeenCalled();
    });

    // Somebody with forty characters needs to find one, not scroll past
    // thirty-nine of them.
    it('narrows the records by what was typed', () => {
      build();

      typeInto('#custom-tracking-target-search', 'sela');

      expect(component.shownTargets).toEqual([otherTarget]);

      typeInto('#custom-tracking-target-search', 'nobody');

      expect(text()).toContain('Nothing matches that');
    });
  });

  describe('showing the record', () => {
    it('draws the sections, tabs and fields as they were defined', () => {
      build();

      expect(text()).toContain('Fleet');
      expect(text()).toContain('Standing');
      expect(text()).toContain('Ship name');
      expect(text()).toContain('Where I stand in the fleet.');
      expect(text()).toContain('How things are going.');
    });

    it('fills each field from what is already recorded', () => {
      getRecord.mockReturnValue(
        of(
          record({
            answers: [anAnswer({ value: { text: 'Adamant' } })],
          }),
        ),
      );
      build();

      expect(component.form.value).toEqual({
        'field-1': { text: 'Adamant' },
      });
    });

    // A required field hidden inside a closed section is a save that fails for
    // a reason nobody can see.
    it('starts every section open, and closes one when asked', () => {
      build();

      expect(component.isOpen('section-1')).toBe(true);

      query<HTMLButtonElement>('.custom-tracking-panel-toggle').click();
      fixture.detectChanges();

      expect(component.isOpen('section-1')).toBe(false);
      expect(query('.custom-tracking-panel-body').hidden).toBe(true);
    });

    it('says so where a section has no tabs', () => {
      getRecord.mockReturnValue(
        of(record({ sections: [section({ tabs: [] })] })),
      );
      build();

      expect(text()).toContain('This section has no tabs yet');
    });

    it('says so where a tab has no fields', () => {
      const empty = section();

      empty.tabs[0].fields = [];
      getRecord.mockReturnValue(of(record({ sections: [empty] })));
      build();

      expect(text()).toContain('This tab has no fields yet');
    });

    it('says so where nothing has been defined for the scope at all', () => {
      getRecord.mockReturnValue(of(record({ sections: [] })));
      build();

      expect(text()).toContain('You have not defined anything to record');
    });

    it('marks a public section as public in words', () => {
      getRecord.mockReturnValue(
        of(record({ sections: [section({ publiclyVisible: true })] })),
      );
      build();

      expect(text()).toContain('Public');
    });

    // Searching never changes what is stored or what is sent, only what is on
    // the screen.
    it('narrows the hierarchy to what matches', () => {
      build();

      typeInto('#custom-tracking-value-search', 'Ship');

      expect(component.shownSections).toHaveLength(1);

      typeInto('#custom-tracking-value-search', 'nothing like it');

      expect(component.shownSections).toEqual([]);
      expect(text()).toContain('Nothing matches that');
    });

    it('has nothing to show before a record has arrived', () => {
      getTargets.mockReturnValue(of([]));
      build();

      expect(component.shownSections).toEqual([]);
    });
  });

  describe('moving between tabs', () => {
    const twoTabs = (): CustomTrackingSectionTree => {
      const built = section();

      built.tabs = [
        built.tabs[0],
        { ...built.tabs[0], id: 'tab-2', name: 'Ships', fields: [] },
      ];

      return built;
    };

    beforeEach(() => {
      getRecord.mockReturnValue(of(record({ sections: [twoTabs()] })));
    });

    it('shows the first tab until another is chosen', () => {
      build();

      expect(component.activeTab(component.record!.sections[0])?.id).toBe(
        'tab-1',
      );

      queryAll<HTMLButtonElement>('[role="tab"]')[1].click();
      fixture.detectChanges();

      expect(component.activeTab(component.record!.sections[0])?.id).toBe(
        'tab-2',
      );
    });

    // A row of tabs is one stop in the tab order rather than one stop per tab.
    it('moves between tabs with the arrow keys', () => {
      build();

      const first = queryAll<HTMLButtonElement>('[role="tab"]')[0];

      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      fixture.detectChanges();

      expect(component.activeTabs['section-1']).toBe('tab-2');
      expect(document.activeElement?.id).toBe(
        'custom-tracking-value-tab-tab-2',
      );
    });

    it('leaves keys that mean nothing in a row alone', () => {
      build();

      const first = queryAll<HTMLButtonElement>('[role="tab"]')[0];

      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      fixture.detectChanges();

      expect(component.activeTabs['section-1']).toBeUndefined();
    });

    it('shows nothing for a section with no tabs at all', () => {
      getRecord.mockReturnValue(
        of(record({ sections: [section({ tabs: [] })] })),
      );
      build();

      expect(component.activeTab(component.record!.sections[0])).toBeNull();
    });
  });

  describe('saving', () => {
    it('sends every field the form draws', () => {
      build();

      typeInto('input[type="text"]', 'Adamant');
      buttonSaying('Save this record').click();

      expect(saveRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
        [{ fieldId: 'field-1', value: { text: 'Adamant' } }],
      );
    });

    // A picture is set through its own endpoint and checked as bytes, so a
    // record save must not carry one.
    it('never sends anything for a picture', () => {
      const withPicture = section();

      withPicture.tabs[0].fields = [
        aField({
          id: 'field-2',
          fieldType: CustomTrackingFieldType.IMAGE,
          configuration: { shape: CustomTrackingImageShape.SQUARE },
        }),
      ];
      getRecord.mockReturnValue(of(record({ sections: [withPicture] })));
      saveRecord.mockReturnValue(of(record({ sections: [withPicture] })));
      build();

      buttonSaying('Save this record').click();

      expect(saveRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
        [],
      );
    });

    it('says the record was saved', () => {
      build();

      buttonSaying('Save this record').click();
      fixture.detectChanges();

      expect(text()).toContain('Saved');
    });

    // Named rather than merely counted, so nobody has to hunt through a long
    // record for the one that is missing.
    it('names the required fields still waiting for an answer', () => {
      const required = section();

      required.tabs[0].fields = [
        aField({ id: 'field-1', name: 'Ship name', required: true }),
      ];
      getRecord.mockReturnValue(of(record({ sections: [required] })));
      build();

      buttonSaying('Save this record').click();
      fixture.detectChanges();

      expect(saveRecord).not.toHaveBeenCalled();
      expect(text()).toContain('Answer every required field first: Ship name');
    });

    it('counts an uploaded picture as answering a required picture field', () => {
      const required = section();

      required.tabs[0].fields = [
        aField({
          id: 'field-2',
          name: 'Ship picture',
          required: true,
          fieldType: CustomTrackingFieldType.IMAGE,
          configuration: { shape: CustomTrackingImageShape.SQUARE },
        }),
      ];
      getRecord.mockReturnValue(of(record({ sections: [required] })));
      saveRecord.mockReturnValue(of(record({ sections: [required] })));
      build();

      component.onImageChanged(required.tabs[0].fields[0], {
        imageId: 'image-1',
        altText: 'A ship',
        shape: CustomTrackingImageShape.SQUARE,
      });
      buttonSaying('Save this record').click();

      expect(saveRecord).toHaveBeenCalled();
    });

    it('refuses to send an answer the field would not accept', () => {
      const bounded = section();

      bounded.tabs[0].fields = [
        aField({
          id: 'field-1',
          fieldType: CustomTrackingFieldType.INTEGER,
          configuration: { minimum: 1, maximum: 10 },
        }),
      ];
      getRecord.mockReturnValue(of(record({ sections: [bounded] })));
      build();

      typeInto('input[type="number"]', '99');
      buttonSaying('Save this record').click();
      fixture.detectChanges();

      expect(saveRecord).not.toHaveBeenCalled();
      expect(text()).toContain('cannot be saved as they stand');
    });

    // The server names the specific problem when it can, which is more use
    // than a generic apology.
    it('repeats what the server said was wrong', () => {
      saveRecord.mockReturnValue(
        throwError(() => ({ error: { message: ['Too long.', 'Too big.'] } })),
      );
      build();

      buttonSaying('Save this record').click();
      fixture.detectChanges();

      expect(text()).toContain('Too long. Too big.');
    });

    it('shows the record the server saved rather than reading it again', () => {
      build();

      typeInto('input[type="text"]', 'Adamant');
      buttonSaying('Save this record').click();
      fixture.detectChanges();

      expect(getRecord).toHaveBeenCalledTimes(1);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('offers nothing to save while recording is paused', () => {
      const configuration = aConfiguration();

      configuration.features.valueEditingEnabled = false;
      build(configuration);

      expect(text()).toContain('Recording values is paused');
      expect(buttonSaying('Save this record').disabled).toBe(true);
    });
  });

  describe('protecting unsaved work', () => {
    it('reports nothing unsaved until something is changed', () => {
      build();

      expect(component.hasUnsavedChanges()).toBe(false);

      typeInto('input[type="text"]', 'Adamant');

      expect(component.hasUnsavedChanges()).toBe(true);
      expect(text()).toContain('Unsaved changes');
    });

    it('asks before changing record with unsaved work in hand', () => {
      build();
      typeInto('input[type="text"]', 'Adamant');

      component.chooseTarget('target-2');

      expect(open).toHaveBeenCalled();
      expect(getRecord).toHaveBeenLastCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-2',
      );
    });

    it('stays where it is when the question is declined', () => {
      open.mockReturnValue({ afterClosed: () => of(false) });
      build();
      typeInto('input[type="text"]', 'Adamant');
      getRecord.mockClear();

      component.chooseTarget('target-2');

      expect(getRecord).not.toHaveBeenCalled();
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('asks before changing scope with unsaved work in hand', () => {
      build();
      typeInto('input[type="text"]', 'Adamant');

      buttonSaying('Characters').click();

      expect(open).toHaveBeenCalled();
      expect(component.scope).toBe(CustomTrackingTargetScope.CHARACTER);
    });

    it('reads the record again when the changes are thrown away', () => {
      build();
      typeInto('input[type="text"]', 'Adamant');
      getRecord.mockClear();

      buttonSaying('Undo my changes').click();
      fixture.detectChanges();

      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
      );
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('has nothing to undo before a record has been opened', () => {
      getTargets.mockReturnValue(of([]));
      build();
      getRecord.mockClear();

      component.revert();

      expect(getRecord).not.toHaveBeenCalled();
    });

    // The route guard cannot see a closed tab or a typed address, so the
    // browser is asked to put up its own warning as well.
    it('asks the browser to warn before the page is thrown away', () => {
      build();

      const quiet = new Event('beforeunload', {
        cancelable: true,
      }) as BeforeUnloadEvent;
      const noisy = new Event('beforeunload', {
        cancelable: true,
      }) as BeforeUnloadEvent;

      component.onBeforeUnload(quiet);
      expect(quiet.defaultPrevented).toBe(false);

      typeInto('input[type="text"]', 'Adamant');
      component.onBeforeUnload(noisy);

      expect(noisy.defaultPrevented).toBe(true);
    });
  });

  describe('filling in a record the host has already chosen', () => {
    const buildFixed = (targetId = 'target-1'): void => {
      fixture = TestBed.createComponent(CustomTrackingValuesComponent);
      component = fixture.componentInstance;
      component.configuration = aConfiguration();
      component.fixedTarget = {
        scope: CustomTrackingTargetScope.ACCOUNT,
        targetId,
      };
      fixture.detectChanges();
    };

    it('opens that record without listing anything to choose from', () => {
      buildFixed();

      expect(getTargets).not.toHaveBeenCalled();
      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
      );
      expect(text()).toContain('Ship name');
    });

    // A chooser that could be moved off the record the surrounding page is
    // showing would be offering to edit something the reader is not looking
    // at.
    it('offers neither hierarchy nor record to move to', () => {
      buildFixed();

      expect(query('#custom-tracking-target')).toBeNull();
      expect(query('#custom-tracking-target-search')).toBeNull();
      expect(buttonSaying('Accounts')).toBeUndefined();
    });

    it('saves against the record it was handed', () => {
      buildFixed();
      typeInto('input[type="text"]', 'Adamant');
      buttonSaying('Save this record').click();

      expect(saveRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
        [{ fieldId: 'field-1', value: { text: 'Adamant' } }],
      );
    });

    it('reads the record again when the panel comes back to the front', () => {
      buildFixed();
      getRecord.mockClear();

      component.active = true;

      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'target-1',
      );
    });

    // The builder is a page away rather than the panel next door, so the way
    // to it has to be a link somebody can follow.
    it('points at Custom Tracking when nothing is defined yet', () => {
      getRecord.mockReturnValue(of(record({ sections: [] })));
      buildFixed();

      expect(query<HTMLAnchorElement>('a').getAttribute('href')).toContain(
        'custom-tracking',
      );
    });
  });
});
