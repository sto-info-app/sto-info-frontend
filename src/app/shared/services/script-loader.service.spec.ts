import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ScriptLoaderService } from './script-loader.service';

const TEST_SCRIPT_PREFIX = 'script-loader-test';

describe('ScriptLoaderService', () => {
  const configureService = (docValue: Document = document) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: docValue }],
    });

    return TestBed.inject(ScriptLoaderService);
  };

  const removeTestScripts = (docSource?: Document | null) => {
    docSource
      ?.querySelectorAll(`script[id^="${TEST_SCRIPT_PREFIX}"]`)
      .forEach(node => node.remove());
  };

  const createDocumentStub = (head: Document['head'] | null): Document =>
    ({
      head,
      body: document.body,
      getElementById: jest.fn().mockReturnValue(null),
      querySelectorAll: jest
        .fn()
        .mockReturnValue([] as unknown as NodeListOf<Element>),
    }) as unknown as Document;

  afterEach(() => {
    removeTestScripts(document);
    TestBed.resetTestingModule();
  });

  it('should load a script into the document head with defaults', () => {
    const service = configureService();
    const scriptId = `${TEST_SCRIPT_PREFIX}-default`;
    service.loadScript({
      id: scriptId,
      src: 'https://example.com/script.js',
      async: true,
    });

    const script = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;
    expect(script).toBeTruthy();
    expect(script?.async).toBe(true);
    expect(script?.defer).toBe(false);
    expect(script?.type).toBe('text/javascript');
    expect(script?.getAttribute('src')).toBe('https://example.com/script.js');
  });

  it('should replace an existing script with the same id', () => {
    const service = configureService();
    const scriptId = `${TEST_SCRIPT_PREFIX}-replace`;
    service.loadScript({ id: scriptId, textContent: 'void 0; // first' });
    service.loadScript({ id: scriptId, textContent: 'void 0; // second' });

    const scripts = document.querySelectorAll(`#${scriptId}`) ?? [];
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.textContent).toContain('second');
  });

  it('should apply custom attributes and trigger callbacks', () => {
    const service = configureService();
    const scriptId = `${TEST_SCRIPT_PREFIX}-options`;
    const onLoad = jest.fn();
    const onError = jest.fn();

    const script = service.loadScript({
      id: scriptId,
      type: 'application/json',
      async: true,
      defer: true,
      attributes: {
        crossorigin: 'anonymous',
        'data-test': 'true',
      },
      textContent: '{"key":"value"}',
      onLoad,
      onError,
    });

    expect(script?.type).toBe('application/json');
    expect(script?.async).toBe(true);
    expect(script?.defer).toBe(true);
    expect(script?.getAttribute('crossorigin')).toBe('anonymous');
    expect(script?.dataset['test']).toBe('true');
    script?.onload?.(new Event('load'));
    expect(onLoad).toHaveBeenCalledTimes(1);
    script?.onerror?.(new Event('error'));
    expect(onError).toHaveBeenCalledTimes(1);
    script?.onerror?.('string-error' as unknown as Event);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should remove script by id', () => {
    const service = configureService();
    const scriptId = `${TEST_SCRIPT_PREFIX}-remove`;
    service.loadScript({ id: scriptId });
    service.removeScript(scriptId);
    expect(document.getElementById(scriptId)).toBeNull();
  });

  it('should return null when the document head is unavailable', () => {
    const serviceWithoutHead = configureService(createDocumentStub(null));
    const result = serviceWithoutHead.loadScript({
      id: 'script-loader-test-null',
    });
    expect(result).toBeNull();
  });

  it('should safely ignore remove requests without a document', () => {
    const service = configureService();
    (service as unknown as { _documentRef: Document | null })._documentRef =
      null;
    expect(() => service.removeScript('orphaned')).not.toThrow();
  });
});
