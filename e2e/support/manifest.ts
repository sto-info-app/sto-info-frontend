import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { backend, EnvironmentReport } from './backend';
import { member } from './member';

/** Written for the run. The reports directory is gitignored. */
export const MANIFEST_PATH = 'reports/playwright/manifest.json';

export type CapabilityStatus = 'ready' | 'deferred' | 'omitted' | 'opt-in';

export interface CapabilityManifest extends EnvironmentReport {
  frontendSha: string;
  node: string;
  playwright: string;
  browser: string;
  apiUrl: string;
  baseUrl: string;
  scan: string;
  partial: boolean;
  omitted: string[];
  capabilities: Record<string, CapabilityStatus>;
}

/**
 * Ask the backend who it is connected to, refuse anything that is not the
 * isolated local stack, and write that down without passwords.
 *
 * @param browser - The browser version Playwright launched.
 * @returns The manifest that was written.
 */
export async function writeManifest(
  browser: string,
): Promise<CapabilityManifest> {
  const report = backend.preflight(
    member.email,
    member.publicAccount,
    member.privateAccount,
  );
  const apiUrl = requiredLocalUrl('E2E_API_URL', 'http://localhost:3000');
  const baseUrl = requiredLocalUrl('E2E_BASE_URL', 'http://localhost:4200');
  const expectedDatabase = requiredEnv('E2E_DATABASE_NAME');
  const expectedRedis = requiredEnv('E2E_REDIS_DB');

  if (report.nodeEnv === 'prod') {
    throw new Error('The backend is running with NODE_ENV=prod.');
  }

  if (report.databaseName !== expectedDatabase) {
    throw new Error(
      `The backend is connected to ${report.databaseName}, and this run was told to use ${expectedDatabase}.`,
    );
  }

  if (!isLocalHost(report.databaseHost)) {
    throw new Error(
      `The database host is ${report.databaseHost}. This harness only runs against a database on this machine.`,
    );
  }

  if (String(report.redisDatabase) !== expectedRedis) {
    throw new Error(
      `Redis logical database is ${report.redisDatabase}, and this run was told to use ${expectedRedis}.`,
    );
  }

  await assertReachable(apiUrl, 'API');
  await assertReachable(baseUrl, 'site');

  if (report.demo.role !== 'USER') {
    throw new Error(
      `The demonstration member is ${report.demo.role}. That account stays an ordinary member.`,
    );
  }

  const omitted = (process.env['E2E_OMIT'] ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const images = process.env['E2E_IMAGES'] === 'on' ? 'opt-in' : 'omitted';
  const manifest: CapabilityManifest = {
    ...report,
    frontendSha: gitRevision(process.cwd()),
    node: process.version,
    playwright: playwrightVersion(),
    browser,
    apiUrl,
    baseUrl,
    scan: process.env['E2E_SCAN'] ?? 'local',
    partial: omitted.length > 0,
    omitted,
    capabilities: {
      A: 'ready',
      M: 'ready',
      B: 'ready',
      META: 'ready',
      V: 'ready',
      CT: 'ready',
      ADM: 'ready',
      N: 'deferred',
      S: 'deferred',
      MOD: 'ready',
      MAIL: 'deferred',
      IMG: images,
      T: 'ready',
    },
  };

  rejectSecrets(manifest);
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

/** The manifest written by preflight. */
export function readManifest(): CapabilityManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as CapabilityManifest;
}

/**
 * Fail if a password or token has been written into the manifest.
 *
 * The failure names the key. It does not repeat the value.
 */
export function rejectSecrets(value: unknown, path = 'manifest'): void {
  const password = process.env['E2E_PASSWORD'];

  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSecrets(item, `${path}[${index}]`));

    return;
  }

  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && password && value === password) {
      throw new Error(`${path} contains the seed password.`);
    }

    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (/password|token|secret|authorization/i.test(key)) {
      throw new Error(`${path}.${key} is not allowed in the manifest.`);
    }

    rejectSecrets(nested, `${path}.${key}`);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not set. The harness will not guess which database it is allowed to use.`,
    );
  }

  return value;
}

function requiredLocalUrl(name: string, fallback: string): string {
  const value = process.env[name]?.trim() || fallback;
  const url = new URL(value);

  if (!isLocalHost(url.hostname)) {
    throw new Error(
      `${name} points at ${url.hostname}. This harness only opens a site on this machine.`,
    );
  }

  return url.origin;
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

async function assertReachable(url: string, label: string): Promise<void> {
  const target = label === 'API' ? `${url}/health/live` : url;
  const response = await fetch(target, { signal: AbortSignal.timeout(10_000) });

  if (response.status !== 200) {
    throw new Error(`${label} at ${target} answered ${response.status}.`);
  }

  await response.arrayBuffer();
}

function gitRevision(directory: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: directory,
    encoding: 'utf8',
  }).trim();
}

function playwrightVersion(): string {
  const packageJson = resolve(
    process.cwd(),
    'node_modules/@playwright/test/package.json',
  );
  const parsed = JSON.parse(readFileSync(packageJson, 'utf8')) as {
    version: string;
  };

  return parsed.version;
}
