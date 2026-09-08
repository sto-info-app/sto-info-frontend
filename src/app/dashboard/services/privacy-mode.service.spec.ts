import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { PrivacyModeService } from './privacy-mode.service';

describe('PrivacyModeService', () => {
  describe('with a DashboardService available', () => {
    let service: PrivacyModeService;
    let dashboardService: jest.Mocked<DashboardService>;

    beforeEach(() => {
      dashboardService = {
        getUserSettings: jest
          .fn()
          .mockReturnValue(
            of({ privacyMode: true, sessionTimeoutMinutes: 240 }),
          ),
        updateUserSettings: jest
          .fn()
          .mockReturnValue(
            of({ privacyMode: false, sessionTimeoutMinutes: 240 }),
          ),
      } as unknown as jest.Mocked<DashboardService>;

      TestBed.configureTestingModule({
        providers: [
          PrivacyModeService,
          { provide: DashboardService, useValue: dashboardService },
        ],
      });

      service = TestBed.inject(PrivacyModeService);
    });

    it('should be created and default to enabled', () => {
      expect(service).toBeTruthy();
      expect(service.isEnabled()).toBe(true);
    });

    it('should load settings and update the signal', () => {
      let result:
        { privacyMode: boolean; sessionTimeoutMinutes: number } | undefined;
      service.load().subscribe(settings => (result = settings));

      expect(dashboardService.getUserSettings).toHaveBeenCalled();
      expect(result).toEqual({ privacyMode: true, sessionTimeoutMinutes: 240 });
      expect(service.isEnabled()).toBe(true);
    });

    it('should update settings and update the signal', () => {
      let result:
        { privacyMode: boolean; sessionTimeoutMinutes: number } | undefined;
      service.update(false, 240).subscribe(settings => (result = settings));

      expect(dashboardService.updateUserSettings).toHaveBeenCalledWith({
        privacyMode: false,
        sessionTimeoutMinutes: 240,
      });
      expect(result).toEqual({
        privacyMode: false,
        sessionTimeoutMinutes: 240,
      });
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('without a DashboardService available', () => {
    let service: PrivacyModeService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          PrivacyModeService,
          { provide: DashboardService, useValue: null },
        ],
      });

      service = TestBed.inject(PrivacyModeService);
    });

    it('should fall back to privacy mode disabled when loading', () => {
      let result:
        { privacyMode: boolean; sessionTimeoutMinutes: number } | undefined;
      service.load().subscribe(settings => (result = settings));

      expect(result).toEqual({
        privacyMode: false,
        sessionTimeoutMinutes: 240,
      });
      expect(service.isEnabled()).toBe(false);
    });

    it('should echo the requested value when updating', () => {
      let result:
        { privacyMode: boolean; sessionTimeoutMinutes: number } | undefined;
      service.update(true, 480).subscribe(settings => (result = settings));

      expect(result).toEqual({
        privacyMode: true,
        sessionTimeoutMinutes: 480,
      });
      expect(service.isEnabled()).toBe(true);
    });
  });
});
