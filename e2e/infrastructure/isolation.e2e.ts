import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { storageStateFor } from '../support/actors';
import { backend } from '../support/backend';
import { readManifest, rejectSecrets } from '../support/manifest';

/**
 * The shared fixtures, without Custom Tracking.
 *
 * These do not depend on the feature being switched on. They check that the
 * run knows every actor, that one case cannot leave the next case a disabled
 * account, and that the manifest it wrote has no secrets in it.
 */

const READY = ['A', 'M', 'B', 'META', 'V', 'CT', 'ADM', 'MOD', 'T'];
const DEFERRED = ['N', 'S', 'MAIL'];

test('the run names every actor and keeps secrets out of the manifest', async () => {
  const manifest = readManifest();

  rejectSecrets(manifest);
  expect(manifest.partial).toBe(false);
  expect(manifest.demo.role).toBe('USER');
  expect(manifest.actors.map(actor => actor.code).sort()).toEqual([
    'ADM',
    'B',
    'MOD',
    'SPOT',
    'TAG',
  ]);
  expect(manifest.actors.find(actor => actor.code === 'ADM')?.role).toBe(
    'ADMIN',
  );
  expect(manifest.actors.find(actor => actor.code === 'ADM')?.grants).toEqual(
    [],
  );
  expect(manifest.actors.find(actor => actor.code === 'B')?.role).toBe('USER');
  expect(manifest.actors.find(actor => actor.code === 'B')?.grants).toEqual([]);
  expect(manifest.actors.find(actor => actor.code === 'MOD')?.role).toBe(
    'USER',
  );
  expect(manifest.actors.find(actor => actor.code === 'MOD')?.grants).toEqual([
    'storytime.moderate',
  ]);
  expect(manifest.actors.find(actor => actor.code === 'SPOT')?.grants).toEqual([
    'storytime.spotlight.manage',
  ]);
  expect(manifest.actors.find(actor => actor.code === 'TAG')?.grants).toEqual([
    'storytime.tag.manage',
  ]);

  for (const code of READY) {
    expect(manifest.capabilities[code]).toBe('ready');
  }

  for (const code of DEFERRED) {
    expect(manifest.capabilities[code]).toBe('deferred');
  }

  expect(['omitted', 'opt-in']).toContain(manifest.capabilities['IMG']);
  expect(manifest.frontendSha).toMatch(/^[0-9a-f]{40}$/);
  expect(manifest.backendSha).toMatch(/^[0-9a-f]{40}$/);
});

test.describe('the second member starts enabled', () => {
  test.beforeEach(() => {
    const manifest = readManifest();
    const second = manifest.actors.find(actor => actor.code === 'B');

    if (!second) {
      throw new Error('The second member is not in the manifest.');
    }

    backend.prepareActor(second.email);
  });

  test('a case can disable the second member', async () => {
    const email = secondMember();

    backend.setDisabled(email, 'on');

    expect(backend.actor(email).isAccountDisabled).toBe(true);
  });

  test('the next case finds that member enabled', async () => {
    expect(backend.actor(secondMember()).isAccountDisabled).toBe(false);
  });

  test('preparing the actor again is what a retry does first', async () => {
    const email = secondMember();

    backend.setDisabled(email, 'on');
    backend.prepareActor(email);

    expect(backend.actor(email).isAccountDisabled).toBe(false);
  });
});

test('each signed-in session is its own file', async () => {
  const manifest = readManifest();
  const codes = ['M', ...manifest.actors.map(actor => actor.code)];

  for (const code of codes) {
    const state = readState(storageStateFor(code));

    rejectSecrets(state);
  }
});

function secondMember(): string {
  const manifest = readManifest();
  const second = manifest.actors.find(actor => actor.code === 'B');

  if (!second) {
    throw new Error('The second member is not in the manifest.');
  }

  return second.email;
}

function readState(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}
