import { Page } from '@playwright/test';

/** The API the running backend is serving. */
export function apiOrigin(): string {
  return (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

/**
 * Call the API with the bearer token the page stored at sign-in.
 *
 * Playwright's request fixture does not send that token: the application
 * keeps it in localStorage, not in a cookie.
 *
 * @param page - A page already on the site, signed in as the caller.
 * @param path - The API path, beginning with `/`.
 * @param method - GET unless the case is attempting a write.
 * @param body - A JSON body, when the method has one.
 * @returns The status and the raw body.
 */
export async function authed(
  page: Page,
  path: string,
  method: 'GET' | 'PUT' = 'GET',
  body?: string,
): Promise<{ status: number; body: string }> {
  const origin = apiOrigin();

  return page.evaluate(
    async ({ origin, path, method, body }) => {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      return { status: response.status, body: await response.text() };
    },
    { origin, path, method, body },
  );
}
