import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CustomTrackingService } from 'src/app/dashboard/settings/custom-tracking/custom-tracking.service';
import {
  CustomTrackingEmptyMode,
  CustomTrackingRecord,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { CustomTrackingConfigurationService } from 'src/app/shared/custom-tracking/custom-tracking-configuration.service';
import {
  aConfiguration,
  aField,
  anAnswer,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';

import { CustomTrackingOwnerDisplayComponent } from './custom-tracking-owner-display.component';

describe('CustomTrackingOwnerDisplayComponent', () => {
  let fixture: ComponentFixture<CustomTrackingOwnerDisplayComponent>;
  let component: CustomTrackingOwnerDisplayComponent;
  let getRecord: jest.Mock;

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

  const build = (targetId: string | null = 'account-1'): void => {
    fixture = TestBed.createComponent(CustomTrackingOwnerDisplayComponent);
    component = fixture.componentInstance;
    component.scope = CustomTrackingTargetScope.ACCOUNT;
    component.targetId = targetId;
    component.ngOnChanges();
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    getRecord = jest.fn(() => of(aRecord()));

    await TestBed.configureTestingModule({
      imports: [CustomTrackingOwnerDisplayComponent],
      providers: [
        { provide: CustomTrackingService, useValue: { getRecord } },
        {
          provide: CustomTrackingConfigurationService,
          useValue: { getConfiguration: () => of(aConfiguration()) },
        },
      ],
    }).compileComponents();
  });

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

  // Custom tracking is an addition to a page that is complete without it, and
  // the feature may be switched off entirely — in which case the request
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

  it('offers nothing to edit with', () => {
    build();

    expect(
      fixture.nativeElement.querySelectorAll('input, textarea, select'),
    ).toHaveLength(0);
  });
});
