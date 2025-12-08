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
async function loadTests() {
  const context = (require as any).context?.('./', true, /\.spec\.ts$/);

  if (context) {
    // Webpack-style (older Angular builders)
    context.keys().forEach(context);
  } else {
    // Vite/esbuild-style (Angular 17+ builders)
    const modules = import.meta.glob('./**/*.spec.ts');
    await Promise.all(Object.values(modules).map(loader => loader()));
  }
}

loadTests();
// --- END DEBUG ---
