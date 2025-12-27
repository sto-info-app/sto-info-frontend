import { alertStateFromHttpStatus } from './alert-state-from-http-status';

describe('alertStateFromHttpStatus', () => {
  it('maps 200 to green', () => {
    expect(alertStateFromHttpStatus(200)).toBe('green');
  });

  it('maps 404 to red', () => {
    expect(alertStateFromHttpStatus(404)).toBe('red');
  });

  it('maps 500 to grey', () => {
    expect(alertStateFromHttpStatus(500)).toBe('grey');
  });

  it('maps 0 to grey', () => {
    expect(alertStateFromHttpStatus(0)).toBe('grey');
  });

  it('maps 401 to yellow', () => {
    expect(alertStateFromHttpStatus(401)).toBe('yellow');
  });

  it('maps 302 to yellow', () => {
    expect(alertStateFromHttpStatus(302)).toBe('yellow');
  });

  it('maps 102 to blue', () => {
    expect(alertStateFromHttpStatus(102)).toBe('blue');
  });
});
