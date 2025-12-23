import type { ScriptLoadOptions } from './script-loader.interface';

describe('ScriptLoadOptions interface', () => {
  // Helper purely to exercise the type at compile time
  const createOptions = (options: ScriptLoadOptions): ScriptLoadOptions =>
    options;

  it('should allow creating a fully populated options object', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();

    const options = createOptions({
      id: 'test-script',
      src: 'https://example.com/test.js',
      type: 'text/javascript',
      async: true,
      defer: true,
      textContent: 'console.log("test");',
      attributes: { crossorigin: 'anonymous', 'data-test': 'value' },
      onLoad,
      onError,
    });

    expect(options.id).toBe('test-script');
    expect(options.src).toBe('https://example.com/test.js');
    expect(options.type).toBe('text/javascript');
    expect(options.async).toBe(true);
    expect(options.defer).toBe(true);
    expect(options.textContent).toBe('console.log("test");');
    expect(options.attributes).toEqual({
      crossorigin: 'anonymous',
      'data-test': 'value',
    });

    // Exercise callbacks to ensure they are callable
    options.onLoad?.();
    options.onError?.(new Event('error'));

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should allow minimal options with only required id', () => {
    const options = createOptions({ id: 'minimal-script' });

    expect(options.id).toBe('minimal-script');
    expect(options.src).toBeUndefined();
    expect(options.onLoad).toBeUndefined();
    expect(options.onError).toBeUndefined();
  });
});
