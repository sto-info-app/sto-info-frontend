import { Renderer2, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RedAlertThemeService } from './red-alert-theme.service';

describe('RedAlertThemeService', () => {
  let service: RedAlertThemeService;
  let renderer: Renderer2;
  let rendererFactory: RendererFactory2;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RedAlertThemeService);
    rendererFactory = TestBed.inject(RendererFactory2);
    renderer = rendererFactory.createRenderer(null, null);
  });

  it('#applyRedAlertThemeThenApplyStaticRedTheme should create a link element with correct attributes and append it to the head', () => {
    const mockLinkElement = document.createElement('link');

    const spyCreateElement = jest
      .spyOn(renderer, 'createElement')
      .mockReturnValue(mockLinkElement);
    const spySetAttribute = jest.spyOn(renderer, 'setAttribute');
    const spyAppendChild = jest.spyOn(renderer, 'appendChild');

    const mockElement = document.createElement('div');
    service.applyRedAlertThemeThenApplyStaticRedTheme(renderer, mockElement);

    expect(spyCreateElement).toHaveBeenCalledWith('link');
    expect(spySetAttribute).toHaveBeenCalledWith(
      mockLinkElement,
      'rel',
      'stylesheet',
    );
    expect(spySetAttribute).toHaveBeenCalledWith(
      mockLinkElement,
      'href',
      'assets/lcars/lcars-red-alert.css',
    );
    expect(spySetAttribute).toHaveBeenCalledWith(
      mockLinkElement,
      'id',
      'red-alert-style-link',
    );
    expect(spyAppendChild).toHaveBeenCalledWith(
      mockElement.ownerDocument.head,
      mockLinkElement,
    );
  });

  //NOTE: Insert other tests - https://app.shortcut.com/startrekonlineinfo/story/314/add-unit-tests-for-all-components
});
