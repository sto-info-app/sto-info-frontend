import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  CreateStoAccountRequest,
  StoAccount,
} from '../models/sto-account.model';
import { StoAccountService } from './sto-account.service';

describe('StoAccountService', () => {
  let service: StoAccountService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<AuthService>;

  const mockAccount: StoAccount = {
    id: '1',
    handle: 'Test#1234',
    username: 'testuser',
    email: 'test@example.com',
    notes: 'Some notes',
    accountCreatedDate: '2023-01-01T00:00:00Z',
    publiclyVisible: true,
    lifetimeSubscription: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    platformId: 'p1',
    launcherId: 'l1',
    userId: 'u1',
  };

  const mockHttpOptions = {
    headers: new HttpHeaders(),
  };

  beforeEach(() => {
    authServiceSpy = {
      getHttpOptionsWithAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StoAccountService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(StoAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAccounts', () => {
    it('should fetch accounts when token is present', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );
      const mockAccounts = [mockAccount];

      service.getAccounts().subscribe(accounts => {
        expect(accounts).toEqual(mockAccounts);
      });

      const req = httpMock.expectOne(API_URLS.STO_ACCOUNT);
      expect(req.request.method).toBe('GET');
      req.flush(mockAccounts);
    });

    it('should throw error when token is missing', (done: jest.DoneCallback) => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.getAccounts().subscribe({
        next: () => done.fail('Should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('getAccount', () => {
    it('should fetch a single account', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );

      service.getAccount('1').subscribe(account => {
        expect(account).toEqual(mockAccount);
      });

      const req = httpMock.expectOne(`${API_URLS.STO_ACCOUNT}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAccount);
    });

    it('should throw error when token is missing', (done: jest.DoneCallback) => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.getAccount('1').subscribe({
        next: () => done.fail('Should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('createAccount', () => {
    it('should create an account', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );
      const request: CreateStoAccountRequest = {
        handle: 'New#1',
        accountCreatedDate: '2023-01-01',
        publiclyVisible: true,
        lifetimeSubscription: false,
        platformId: 'p1',
      };

      service.createAccount(request).subscribe(account => {
        expect(account).toEqual(mockAccount);
      });

      const req = httpMock.expectOne(API_URLS.STO_ACCOUNT);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockAccount);
    });

    it('should throw error when token is missing', (done: jest.DoneCallback) => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.createAccount({} as CreateStoAccountRequest).subscribe({
        next: () => done.fail('Should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('updateAccount', () => {
    it('should update an account', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );
      const request = { handle: 'Updated' };

      service.updateAccount('1', request).subscribe(account => {
        expect(account).toEqual(mockAccount);
      });

      const req = httpMock.expectOne(`${API_URLS.STO_ACCOUNT}/1`);
      expect(req.request.method).toBe('PUT');
      // If updating handle, it should remain 'handle'
      expect(req.request.body).toEqual(request);
      req.flush(mockAccount);
    });

    it('should throw error when token is missing', (done: jest.DoneCallback) => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.updateAccount('1', {}).subscribe({
        next: () => done.fail('Should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete an account', () => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(
        mockHttpOptions,
      );

      service.deleteAccount('1').subscribe();

      const req = httpMock.expectOne(`${API_URLS.STO_ACCOUNT}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should throw error when token is missing', (done: jest.DoneCallback) => {
      authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.deleteAccount('1').subscribe({
        next: () => done.fail('Should have failed'),
        error: error => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('getPlatforms', () => {
    it('should fetch platforms', () => {
      const mockPlatforms = [{ id: '1', name: 'PC' }];
      service.getPlatforms().subscribe(platforms => {
        expect(platforms).toEqual(mockPlatforms);
      });

      const req = httpMock.expectOne(API_URLS.STO_PLATFORM);
      expect(req.request.method).toBe('GET');
      req.flush(mockPlatforms);
    });

    it('should handle error when fetching platforms', (done: jest.DoneCallback) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.getPlatforms().subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error fetching platforms:',
            expect.anything(),
          );
          consoleSpy.mockRestore();
          done();
        },
      });

      const req = httpMock.expectOne(API_URLS.STO_PLATFORM);
      req.error(new ProgressEvent('error'));
    });
    it('should return cached platforms on subsequent calls', () => {
      const mockPlatforms = [{ id: '1', name: 'PC' }];

      // First call
      service.getPlatforms().subscribe();
      const req = httpMock.expectOne(API_URLS.STO_PLATFORM);
      req.flush(mockPlatforms);

      // Second call
      service.getPlatforms().subscribe(platforms => {
        expect(platforms).toEqual(mockPlatforms);
      });

      // Should not trigger another request
      httpMock.expectNone(API_URLS.STO_PLATFORM);
    });
  });

  describe('getLaunchers', () => {
    it('should fetch launchers', () => {
      const mockLaunchers = [{ id: '1', name: 'Arc' }];
      service.getLaunchers().subscribe(launchers => {
        expect(launchers).toEqual(mockLaunchers);
      });

      const req = httpMock.expectOne(API_URLS.STO_LAUNCHER);
      expect(req.request.method).toBe('GET');
      req.flush(mockLaunchers);
    });

    it('should handle error when fetching launchers', (done: jest.DoneCallback) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.getLaunchers().subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error fetching launchers:',
            expect.anything(),
          );
          consoleSpy.mockRestore();
          done();
        },
      });

      const req = httpMock.expectOne(API_URLS.STO_LAUNCHER);
      req.error(new ProgressEvent('error'));
    });

    it('should return cached launchers on subsequent calls', () => {
      const mockLaunchers = [{ id: '1', name: 'Arc' }];

      // First call
      service.getLaunchers().subscribe();
      const req = httpMock.expectOne(API_URLS.STO_LAUNCHER);
      req.flush(mockLaunchers);

      // Second call
      service.getLaunchers().subscribe(launchers => {
        expect(launchers).toEqual(mockLaunchers);
      });

      // Should not trigger another request
      httpMock.expectNone(API_URLS.STO_LAUNCHER);
    });
  });

  describe('getPlatformLaunchers', () => {
    it('should fetch platform launchers', () => {
      const mockMappings = [{ platformId: 'p1', launcherId: 'l1' }];
      service.getPlatformLaunchers().subscribe(mappings => {
        expect(mappings).toEqual(mockMappings);
      });

      const req = httpMock.expectOne(API_URLS.STO_PLATFORM_LAUNCHER);
      expect(req.request.method).toBe('GET');
      req.flush(mockMappings);
    });

    it('should handle error when fetching mappings', (done: jest.DoneCallback) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.getPlatformLaunchers().subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error fetching platform-launchers:',
            expect.anything(),
          );
          consoleSpy.mockRestore();
          done();
        },
      });

      const req = httpMock.expectOne(API_URLS.STO_PLATFORM_LAUNCHER);
      req.error(new ProgressEvent('error'));
    });

    it('should return cached platform launchers on subsequent calls', () => {
      const mockMappings = [{ platformId: 'p1', launcherId: 'l1' }];

      // First call
      service.getPlatformLaunchers().subscribe();
      const req = httpMock.expectOne(API_URLS.STO_PLATFORM_LAUNCHER);
      req.flush(mockMappings);

      // Second call
      service.getPlatformLaunchers().subscribe(mappings => {
        expect(mappings).toEqual(mockMappings);
      });

      // Should not trigger another request
      httpMock.expectNone(API_URLS.STO_PLATFORM_LAUNCHER);
    });
  });
});
