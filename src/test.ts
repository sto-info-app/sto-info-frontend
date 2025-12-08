// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// --- DEBUG: log which spec is running ---
const jasmineEnv = (window as any).jasmine.getEnv();
let specCounter = 0;

jasmineEnv.addReporter({
  specStarted(result: any) {
    specCounter += 1;
    // eslint-disable-next-line no-console
    console.log(`SPEC START [${specCounter}] ${result.fullName}`);
  },
  specDone(result: any) {
    // eslint-disable-next-line no-console
    console.log(
      `SPEC DONE  [${specCounter}] ${result.fullName} - ${result.status}`,
    );
  },
});

// Then the usual Angular CLI bit that loads all specs:
import.meta.glob('./**/*.spec.ts', { eager: true });
