import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

expect.extend({
  toBeTrue(received: unknown) {
    const pass = received === true;
    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          pass ? 'not ' : ''
        }to be true`,
    };
  },
  toBeFalse(received: unknown) {
    const pass = received === false;
    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          pass ? 'not ' : ''
        }to be false`,
    };
  },
});

// Minimal jasmine global used in existing specs (SpyObj/createSpyObj)
(globalThis as any).jasmine = {
  ...(globalThis as any).jasmine,
  createSpyObj: (
    baseName: string,
    methodNames: readonly string[] = [],
    properties?: Record<string, any>,
  ) => {
    const obj: Record<string, any> = {};
    for (const name of methodNames) {
      obj[name] = jest.fn();
    }
    if (properties) {
      Object.assign(obj, properties);
    }
    return obj;
  },
};

// Global spyOn delegating to Jest's spy implementation
(globalThis as any).spyOn = (object: any, method: string) =>
  jest.spyOn(object, method as any);
