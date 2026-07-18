jest.mock('src/environments/environment', () => ({
  environment: { apiUrl: 'https://api.test' },
}));

import { API_URLS } from './api-routing.constants';

describe('api-routing.constants', () => {
  it('should set ROOT from environment apiUrl', () => {
    expect(API_URLS.ROOT).toBe('https://api.test');
  });

  it('should build auth URLs under /auth', () => {
    expect(API_URLS.AUTH_LOGIN).toBe('https://api.test/auth/login');
    expect(API_URLS.AUTH_REGISTER).toBe('https://api.test/auth/register');
    expect(API_URLS.AUTH_REFRESH).toBe('https://api.test/auth/refresh');
  });

  it('should build health URLs under /health', () => {
    expect(API_URLS.HEALTH_LIVE).toBe('https://api.test/health/live');
    expect(API_URLS.HEALTH_READY).toBe('https://api.test/health/ready');
  });

  it('should build user and STO account URLs', () => {
    expect(API_URLS.USER).toBe('https://api.test/user');
    expect(API_URLS.CLOSE_ACCOUNT).toBe('https://api.test/user/close-account');
    expect(API_URLS.STO_ACCOUNT).toBe('https://api.test/account');
    expect(API_URLS.CHARACTER).toBe('https://api.test/character');
  });
});
