import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ASSET_SCAN_AVAILABLE,
  ASSET_SCAN_AWAITING,
  ASSET_SCAN_REJECTED,
  ASSET_SCAN_SCANNING,
  ASSET_SCAN_STATES,
  ASSET_SCAN_UPLOADING,
  AssetScanState,
} from 'src/app/shared/constants/asset-scan.constants';

import { AssetScanStatusComponent } from './asset-scan-status.component';

describe('AssetScanStatusComponent', () => {
  let fixture: ComponentFixture<AssetScanStatusComponent>;

  const everyState: AssetScanState[] = [
    ASSET_SCAN_UPLOADING,
    ASSET_SCAN_AWAITING,
    ASSET_SCAN_SCANNING,
    ASSET_SCAN_AVAILABLE,
    ASSET_SCAN_REJECTED,
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetScanStatusComponent],
    }).compileComponents();
  });

  /**
   * Renders the strip.
   *
   * @param state - The state to draw.
   * @param fileName - The file's name, where one is shown.
   */
  function render(state: AssetScanState, fileName: string | null = null): void {
    fixture = TestBed.createComponent(AssetScanStatusComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('fileName', fileName);
    fixture.detectChanges();
  }

  /**
   * Finds one element in the strip.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  /**
   * The strip's whole text.
   *
   * @returns The text content.
   */
  const text = (): string => fixture.nativeElement.textContent as string;

  it.each(everyState)('names and explains %s', state => {
    render(state);

    expect(text()).toContain(ASSET_SCAN_STATES[state].label);
    expect(text()).toContain(ASSET_SCAN_STATES[state].description);
  });

  it('gives every state its own wording', () => {
    const labels = everyState.map(state => ASSET_SCAN_STATES[state].label);

    expect(new Set(labels).size).toBe(everyState.length);
  });

  it('shows the file it is talking about', () => {
    render(ASSET_SCAN_SCANNING, 'fleet-roster.csv');

    expect(find('.asset-scan-status__file')?.textContent).toContain(
      'fleet-roster.csv',
    );
  });

  // A filename is something somebody chose, and an upload form is the obvious
  // place to try putting markup in one.
  it('renders a filename containing markup as text', () => {
    render(ASSET_SCAN_REJECTED, '<img src="x" onerror="alert(1)">.csv');

    expect(find('.asset-scan-status__file img')).toBeNull();
    expect(text()).toContain('<img');
  });

  it('leaves the filename out when there is none to show', () => {
    render(ASSET_SCAN_UPLOADING);

    expect(find('.asset-scan-status__file')).toBeNull();
  });

  /**
   * Naming the signature that matched tells somebody probing the scanner
   * exactly what got through. The rejection says the file was refused, that
   * nothing already in place has changed, and stops.
   */
  it('refuses a file without saying what was found in it', () => {
    render(ASSET_SCAN_REJECTED);

    expect(text()).toContain('refused');
    expect(text()).toContain('has not been kept');
    expect(text().toLowerCase()).not.toContain('virus');
    expect(text().toLowerCase()).not.toContain('signature');
    expect(text().toLowerCase()).not.toContain('malware');
  });

  // The point of the strip: an upload no longer finishes when the request
  // does, and a page that says nothing for those seconds gets the file sent
  // again.
  it('says a held file is not yet visible to anyone', () => {
    render(ASSET_SCAN_AWAITING);

    expect(text()).toContain('held privately');
    expect(text()).toContain('Nobody can see or download it yet');
  });

  it.each([ASSET_SCAN_UPLOADING, ASSET_SCAN_AWAITING, ASSET_SCAN_SCANNING])(
    'shows a progress bar while %s',
    state => {
      render(state);

      expect(find('.asset-scan-status__progress')).not.toBeNull();
    },
  );

  // A progress animation under a finished upload says the site is still
  // working when it is not.
  it.each([ASSET_SCAN_AVAILABLE, ASSET_SCAN_REJECTED])(
    'shows no progress bar once %s',
    state => {
      render(state);

      expect(find('.asset-scan-status__progress')).toBeNull();
    },
  );

  // Colour is the fourth way the state is conveyed, never the only one.
  it.each(everyState)(
    'carries a state class as well as a colour for %s',
    state => {
      render(state);

      expect(
        find('.asset-scan-status')?.classList.contains(
          `asset-scan-status--${ASSET_SCAN_STATES[state].modifier}`,
        ),
      ).toBe(true);
    },
  );

  // Four states arrive one after another without the reader doing anything;
  // an assertive region would interrupt them four times for one upload.
  it('announces the state politely', () => {
    render(ASSET_SCAN_SCANNING);

    expect(find('output')).not.toBeNull();
  });

  it('hides the icon from assistive technology, since the label says it', () => {
    render(ASSET_SCAN_AVAILABLE);

    expect(find('i')?.getAttribute('aria-hidden')).toBe('true');
  });
});
