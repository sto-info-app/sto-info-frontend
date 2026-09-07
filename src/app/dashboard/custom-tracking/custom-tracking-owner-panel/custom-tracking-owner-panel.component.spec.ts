import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CustomTrackingService } from 'src/app/dashboard/settings/custom-tracking/custom-tracking.service';
import {
  CustomTrackingEmptyMode,
  CustomTrackingPolicyStatus,
  CustomTrackingRecord,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { CustomTrackingConfigurationService } from 'src/app/shared/custom-tracking/custom-tracking-configuration.service';
import {
  aConfiguration,
  aField,
  anAnswer,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';

import { CustomTrackingOwnerPanelComponent } from './custom-tracking-owner-panel.component';

describe('CustomTrackingOwnerPanelComponent', () => {
  let fixture: ComponentFixture<CustomTrackingOwnerPanelComponent>;
  let component: CustomTrackingOwnerPanelComponent;
  let getRecord: jest.Mock;
  let getPolicyStatus: jest.Mock;
  let getConfiguration: jest.Mock;
  let getTargets: jest.Mock;
  let saveRecord: jest.Mock;
  let open: jest.Mock;

  const aRecord = (): CustomTrackingRecord => ({
    target: {
      scope: CustomTrackingTargetScope.ACCOUNT,
      id: 'account-1',
      label: 'ares',
      publiclyVisible: false,
    },
    sections: [
      {
        id: 'section-1',
        targetScope: CustomTrackingTargetScope.ACCOUNT,
        name: 'Fleet duties',
        description: null,
        orderIndex: 1000,
        publiclyVisible: false,
        suppressed: false,
        tabs: [
          {
            id: 'tab-1',
            sectionId: 'section-1',
            name: 'Provisioning',
            description: null,
            orderIndex: 1000,
            publiclyVisible: false,
            suppressed: false,
            fields: [
              aField({ ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL }),
            ],
          },
        ],
      },
    ],
    answers: [anAnswer({ value: { text: 'Bellerophon' } })],
  });

  const aStatus = (
    overrides: Partial<CustomTrackingPolicyStatus> = {},
  ): CustomTrackingPolicyStatus => ({
    currentVersion: '2',
    effectiveDate: '2409-01-01',
    updatedDate: '2409-01-01',
    acceptedVersion: '2',
    acceptedAt: '2409-01-02',
    acceptanceRequired: false,
    ...overrides,
  });

  const build = (targetId: string | null = 'account-1'): void => {
    fixture = TestBed.createComponent(CustomTrackingOwnerPanelComponent);
    component = fixture.componentInstance;
    component.scope = CustomTrackingTargetScope.ACCOUNT;
    component.targetId = targetId;
    component.ngOnChanges();
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  const buttonSaying = (label: string): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'button',
      ) as NodeListOf<HTMLButtonElement>,
    ).filter(button => (button.textContent ?? '').includes(label))[0];

  const edit = (): void => {
    buttonSaying('Edit tracked data').click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    getRecord = jest.fn(() => of(aRecord()));
    getPolicyStatus = jest.fn(() => of(aStatus()));
    getConfiguration = jest.fn(() => of(aConfiguration()));
    getTargets = jest.fn(() => of([]));
    saveRecord = jest.fn(() => of(aRecord()));
    open = jest.fn(() => ({ afterClosed: () => of(true) }));

    await TestBed.configureTestingModule({
      imports: [CustomTrackingOwnerPanelComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: { open } },
        {
          provide: CustomTrackingService,
          useValue: {
            getRecord,
            getPolicyStatus,
            getConfiguration,
            getTargets,
            saveRecord,
          },
        },
        {
          provide: CustomTrackingConfigurationService,
          useValue: { getConfiguration: () => of(aConfiguration()) },
        },
      ],
    }).compileComponents();
  });

  describe('showing what was recorded', () => {
    it('shows what the owner recorded against this record', () => {
      build();

      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'account-1',
      );
      expect(text()).toContain('Fleet duties');
      expect(text()).toContain('Bellerophon');
    });

    it('asks for nothing before the page knows which record it is showing', () => {
      build(null);

      expect(getRecord).not.toHaveBeenCalled();
      expect(component.sections).toEqual([]);
    });

    // Custom tracking is an addition to a page that is complete without it,
    // and the feature may be switched off entirely — in which case the request
    // answers 404 by design.
    it('says nothing when the record cannot be fetched', () => {
      getRecord.mockReturnValue(throwError(() => new Error('no')));
      build();

      expect(component.sections).toEqual([]);
      expect(text().trim()).toBe('');
    });

    it('clears what it was showing before fetching another record', () => {
      build();

      getRecord.mockReturnValue(throwError(() => new Error('no')));
      component.targetId = 'account-2';
      component.ngOnChanges();
      fixture.detectChanges();

      expect(component.sections).toEqual([]);
    });
  });

  describe('offering to edit', () => {
    it('offers the editor for a record with fields defined', () => {
      build();

      expect(buttonSaying('Edit tracked data')).toBeTruthy();
    });

    // Somebody whose fields are all unanswered sees none of them, and is
    // exactly the person who needs the control that lets them answer one.
    it('offers it even where the owner rule hides every field', () => {
      const record = aRecord();

      record.sections[0].tabs[0].fields = [
        aField({ ownerEmptyMode: CustomTrackingEmptyMode.HIDE }),
      ];
      record.answers = [];
      getRecord.mockReturnValue(of(record));
      build();

      expect(component.sections).toEqual([]);
      expect(buttonSaying('Edit tracked data')).toBeTruthy();
    });

    it('offers nothing on a page with no fields defined against it', () => {
      const record = aRecord();

      record.sections = [];
      getRecord.mockReturnValue(of(record));
      build();

      expect(text().trim()).toBe('');
    });

    it('offers nothing while recording values is paused', () => {
      const configuration = aConfiguration();

      configuration.features.valueEditingEnabled = false;
      getConfiguration.mockReturnValue(of(configuration));
      build();

      expect(buttonSaying('Edit tracked data')).toBeFalsy();
      expect(text()).toContain('Fleet duties');
    });

    // The one reason editing is withheld that the user can act on, so the only
    // one said out loud.
    it('sends the user to accept the agreement when that is what is missing', () => {
      getPolicyStatus.mockReturnValue(
        of(aStatus({ acceptanceRequired: true })),
      );
      build();

      expect(buttonSaying('Edit tracked data')).toBeFalsy();
      expect(text()).toContain('content agreement has changed');
    });
  });

  describe('editing in place', () => {
    it('uses an empty target before a record is selected', () => {
      build(null);
      expect(component.fixedTarget).toEqual({
        scope: CustomTrackingTargetScope.ACCOUNT,
        targetId: '',
      });
    });

    it('has nothing to lose before the opened editor is rendered', () => {
      build();
      component.startEditing();
      expect(component.values).toBeUndefined();
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('closes without fetching when the target has been cleared', () => {
      build();
      edit();
      component.targetId = null;
      getRecord.mockClear();
      component.stopEditing();
      expect(component.isEditing).toBe(false);
      expect(component.sections).toEqual([]);
      expect(getRecord).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    });

    it('clears stale values when refreshing after closing fails', () => {
      build();
      edit();
      getRecord.mockReturnValue(throwError(() => new Error('unavailable')));
      buttonSaying('Done editing').click();
      fixture.detectChanges();
      expect(component.isEditing).toBe(false);
      expect(component.sections).toEqual([]);
      expect(text()).not.toContain('Bellerophon');
      expect(open).not.toHaveBeenCalled();
    });

    it('opens the editor on this record, with nothing else to choose', () => {
      build();
      edit();

      expect(component.values?.fixedTarget).toEqual({
        scope: CustomTrackingTargetScope.ACCOUNT,
        targetId: 'account-1',
      });
      expect(getTargets).not.toHaveBeenCalled();
      expect(text()).toContain('Save this record');
    });

    it('reads the record back when the editor is closed', () => {
      build();
      edit();
      getRecord.mockClear();

      buttonSaying('Done editing').click();
      fixture.detectChanges();

      expect(getRecord).toHaveBeenCalledWith(
        CustomTrackingTargetScope.ACCOUNT,
        'account-1',
      );
      expect(text()).toContain('Bellerophon');
    });

    it('asks before closing the editor on unsaved work', () => {
      build();
      edit();
      component.values?.form.markAsDirty();

      expect(component.hasUnsavedChanges()).toBe(true);

      buttonSaying('Done editing').click();
      fixture.detectChanges();

      expect(open).toHaveBeenCalled();
      expect(component.isEditing).toBe(false);
    });

    it('stays open when the user decides not to discard', () => {
      open.mockReturnValue({ afterClosed: () => of(false) });
      build();
      edit();
      component.values?.form.markAsDirty();

      buttonSaying('Done editing').click();
      fixture.detectChanges();

      expect(component.isEditing).toBe(true);
    });

    it('has nothing to lose before the editor has been opened', () => {
      build();

      expect(component.hasUnsavedChanges()).toBe(false);
    });
  });
});
