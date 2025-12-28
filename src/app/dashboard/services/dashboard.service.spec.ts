import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { EditPersonalDetailsFormValues } from 'src/app/models/user-auth.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { User } from '../models/user.model';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAuthService = {
      getHttpOptionsWithAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUser', () => {
    const mockUser: User = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      personalDetails: {
        birthday: '1990-01-01',
        gender: 'Male',
      },
    } as User;

    it('should fetch user details successfully', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue({
        headers: new HttpHeaders().set('Authorization', 'Bearer fake-token'),
      });

      service.getUser().subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(API_URLS.USER);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer fake-token',
      );
      req.flush(mockUser);
    });

    it('should return error if no token found', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.getUser().subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
        },
      });

      httpMock.expectNone(API_URLS.USER);
    });
  });

  describe('updatePersonalDetails', () => {
    const details: EditPersonalDetailsFormValues = {
      firstName: 'Updated',
      lastName: 'User',
    } as EditPersonalDetailsFormValues;

    it('should update personal details successfully', () => {
      service.updatePersonalDetails(details).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(API_URLS.UPDATE_USER_PROFILE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(details);
      req.flush({ success: true });
    });

    it('should handle error during update', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      service.updatePersonalDetails(details).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(API_URLS.UPDATE_USER_PROFILE);
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('updateProfilePic', () => {
    let formData: FormData;

    beforeEach(() => {
      formData = new FormData();
      formData.append('image', new Blob([''], { type: 'image/png' }));
    });

    it('should update profile picture successfully', () => {
      const headers = new HttpHeaders()
        .set('Authorization', 'Bearer fake-token')
        .set('Content-Type', 'multipart/form-data');

      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue({
        headers,
      });

      service.updateProfilePic(formData).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(API_URLS.UPDATE_USER_PROFILE_PIC);
      expect(req.request.method).toBe('POST');
      // Content-Type should have been removed to let browser set it with boundary
      expect(req.request.headers.has('Content-Type')).toBe(false);
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer fake-token',
      );
      req.flush({ success: true });
    });

    it('should return error if no token found for profile pic update', () => {
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.updateProfilePic(formData).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
        },
      });

      httpMock.expectNone(API_URLS.UPDATE_USER_PROFILE_PIC);
    });

    it('should handle error during profile pic update', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockAuthService.getHttpOptionsWithAccessToken.mockReturnValue({
        headers: new HttpHeaders().set('Authorization', 'Bearer fake-token'),
      });

      service.updateProfilePic(formData).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(API_URLS.UPDATE_USER_PROFILE_PIC);
      req.flush('Error', { status: 400, statusText: 'Bad Request' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
