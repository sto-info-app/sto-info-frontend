import {
  HTTP_STATUS_OK,
  HTTP_STATUS_CREATED,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_RESPONSE_TYPE_TEXT,
} from './http.constants';

describe('http.constants', () => {
  it('should export success status codes', () => {
    expect(HTTP_STATUS_OK).toBe(200);
    expect(HTTP_STATUS_CREATED).toBe(201);
  });

  it('should export client error status codes', () => {
    expect(HTTP_STATUS_BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS_UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS_NOT_FOUND).toBe(404);
  });

  it('should export server error status code', () => {
    expect(HTTP_STATUS_INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('should export HTTP_RESPONSE_TYPE_TEXT', () => {
    expect(HTTP_RESPONSE_TYPE_TEXT).toBe('text');
  });
});
