import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ModerationHoldExtendDialogComponent } from './moderation-hold-extend-dialog.component';

const DAY = 86_400_000;
const NOW = new Date('2026-09-29T12:00:00Z');

describe('ModerationHoldExtendDialogComponent', () => {
  let close: jest.Mock;
  let element: HTMLElement;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['queueMicrotask'] });
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ModerationHoldExtendDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { subject: 'Kira', reviewAt: '2026-10-01T00:00:00Z' },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(
      ModerationHoldExtendDialogComponent,
    );

    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Sets a field.
   *
   * @param selector - The field.
   * @param value - Its value.
   */
  const set = (selector: string, value: string) => {
    const field = element.querySelector(selector) as HTMLInputElement;

    field.value = value;
    field.dispatchEvent(new Event('input'));
  };
  const extend = () =>
    element.querySelector('button.green') as HTMLButtonElement;

  it('offers the latest date first, bounded to the next 180 days', () => {
    const day = element.querySelector('#hold-review-day') as HTMLInputElement;

    expect(element.textContent).toContain('Kira');
    expect(day.value).toBe(
      new Date(NOW.getTime() + 179 * DAY).toISOString().slice(0, 10),
    );
    expect(day.getAttribute('min')).toBe('2026-09-30');
    expect(extend().disabled).toBe(true);
  });

  it('extends to the end of the day chosen, with the reason', () => {
    set('#hold-review-day', '2026-12-01');
    set('#hold-extend-reason', '  Still investigating  ');
    extend().click();

    expect(close).toHaveBeenCalledWith({
      reviewAt: '2026-12-01T23:59:59.000Z',
      reason: 'Still investigating',
    });
  });

  it.each(['2026-09-29', '2027-06-01'])('refuses %s, out of reach', day => {
    set('#hold-review-day', day);
    set('#hold-extend-reason', 'Why');

    expect(extend().disabled).toBe(true);
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();
  });

  it('changes nothing on cancel', () => {
    (element.querySelector('button.red') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });
});
