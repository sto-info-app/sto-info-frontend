import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { PrivacyModeService } from '../services/privacy-mode.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let privacyModeService: jest.Mocked<PrivacyModeService>;

  beforeEach(async () => {
    privacyModeService = {
      load: jest.fn().mockReturnValue(of({ privacyMode: false })),
      update: jest.fn().mockReturnValue(of({ privacyMode: false })),
    } as unknown as jest.Mocked<PrivacyModeService>;

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: PrivacyModeService, useValue: privacyModeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
  });

  it('shows help for privacy mode', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.settings-help-trigger',
    ) as HTMLElement | null;

    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('aria-label')).toBe('Privacy mode details');
    expect(fixture.nativeElement.textContent).toContain(
      'Private details like email addresses and real names are hidden while this is on.',
    );
  });
});
