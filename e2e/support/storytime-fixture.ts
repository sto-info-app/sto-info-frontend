import { readFileSync } from 'node:fs';

import { SeededStorytime } from './backend';

/** Where the Storytime prepare project leaves the voyage it published. */
export const STORYTIME_FIXTURE = 'reports/playwright/storytime.json';

/** The voyage published for the cases that run with Storytime switched on. */
export function readStorytimeFixture(): SeededStorytime {
  return JSON.parse(readFileSync(STORYTIME_FIXTURE, 'utf8')) as SeededStorytime;
}
