import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { PrivacyModeService } from '../services/privacy-mode.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let privacyModeService: jest.Mocked<PrivacyModeService>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    privacyModeService = {
      load: jest.fn().mockReturnValue(of({ privacyMode: false })),
      update: jest.fn().mockReturnValue(of({ privacyMode: true })),
    } as unknown as jest.Mocked<PrivacyModeService>;

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: PrivacyModeService, useValue: privacyModeService },
      ],
    }).compileComponents();
  });

  it('should create and load the current settings', () => {
    createComponent();

    expect(component).toBeTruthy();
    expect(privacyModeService.load).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.settingsForm.getRawValue()).toEqual({
      privacyMode: false,
    });
  });

  it('shows help for privacy mode', () => {
    createComponent();

    const trigger = fixture.nativeElement.querySelector(
      '.settings-help-trigger',
    ) as HTMLElement | null;

    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('aria-label')).toBe('Privacy mode details');
    expect(fixture.nativeElement.textContent).toContain(
      'Private details like email addresses and usernames are hidden while this is on.',
    );
  });

  it('shows an error when settings fail to load', () => {
    privacyModeService.load.mockReturnValue(
      throwError(() => new Error('nope')),
    );

    createComponent();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Unable to load settings.');
    expect(fixture.nativeElement.textContent).toContain(
      'Unable to load settings.',
    );
  });

  it('saves the settings and marks the form pristine', () => {
    createComponent();
    component.settingsForm.controls.privacyMode.setValue(true);
    component.settingsForm.markAsDirty();

    component.save();

    expect(privacyModeService.update).toHaveBeenCalledWith(true);
    expect(component.isSaving).toBe(false);
    expect(component.settingsForm.getRawValue()).toEqual({ privacyMode: true });
    expect(component.settingsForm.pristine).toBe(true);
  });

  it('shows an error when saving fails', () => {
    privacyModeService.update.mockReturnValue(
      throwError(() => new Error('nope')),
    );
    createComponent();

    component.save();

    expect(component.isSaving).toBe(false);
    expect(component.errorMessage).toBe('Unable to save settings.');
  });

  it('ignores a save while another save is in flight', () => {
    createComponent();
    component.isSaving = true;

    component.save();

    expect(privacyModeService.update).not.toHaveBeenCalled();
  });

  it('submits the form when the save button is clicked', () => {
    createComponent();
    component.settingsForm.markAsDirty();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    button.click();

    expect(privacyModeService.update).toHaveBeenCalledWith(false);
  });
});
