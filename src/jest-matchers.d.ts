declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTrue(): R;
      toBeFalse(): R;
    }
  }
}

export {};
