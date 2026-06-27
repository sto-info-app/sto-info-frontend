import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { observeInZone } from './observe-in-zone.operator';

describe('observeInZone', () => {
  let ngZone: jest.Mocked<Pick<NgZone, 'run'>>;
  let cdr: jest.Mocked<Pick<ChangeDetectorRef, 'detectChanges'>>;

  beforeEach(() => {
    // `run` executes the callback synchronously so assertions stay simple.
    ngZone = { run: jest.fn(fn => fn()) } as unknown as jest.Mocked<
      Pick<NgZone, 'run'>
    >;
    cdr = { detectChanges: jest.fn() } as unknown as jest.Mocked<
      Pick<ChangeDetectorRef, 'detectChanges'>
    >;
  });

  it('passes values through unchanged', () => {
    const received: number[] = [];
    of(1, 2, 3)
      .pipe(
        observeInZone(
          ngZone as unknown as NgZone,
          cdr as unknown as ChangeDetectorRef,
        ),
      )
      .subscribe(value => received.push(value));

    expect(received).toEqual([1, 2, 3]);
  });

  it('delivers each next inside the zone and forces change detection', () => {
    of('a')
      .pipe(
        observeInZone(
          ngZone as unknown as NgZone,
          cdr as unknown as ChangeDetectorRef,
        ),
      )
      .subscribe();

    // One run for next, one for complete.
    expect(ngZone.run).toHaveBeenCalledTimes(2);
    expect(cdr.detectChanges).toHaveBeenCalledTimes(2);
  });

  it('runs the next callback within the zone before detecting changes', () => {
    const order: string[] = [];
    ngZone.run.mockImplementation(fn => {
      order.push('zone');
      return fn();
    });
    cdr.detectChanges.mockImplementation(() => order.push('detect'));

    of('a')
      .pipe(
        observeInZone(
          ngZone as unknown as NgZone,
          cdr as unknown as ChangeDetectorRef,
        ),
      )
      .subscribe(() => order.push('next'));

    expect(order).toEqual([
      'zone',
      'next',
      'detect',
      // completion
      'zone',
      'detect',
    ]);
  });

  it('delivers errors inside the zone and forces change detection', () => {
    const onError = jest.fn();

    throwError(() => new Error('boom'))
      .pipe(
        observeInZone(
          ngZone as unknown as NgZone,
          cdr as unknown as ChangeDetectorRef,
        ),
      )
      .subscribe({ error: onError });

    expect(onError).toHaveBeenCalledWith(new Error('boom'));
    expect(ngZone.run).toHaveBeenCalledTimes(1);
    expect(cdr.detectChanges).toHaveBeenCalledTimes(1);
  });

  it('forces change detection on completion', () => {
    const onComplete = jest.fn();
    const subject = new Subject<number>();

    subject
      .pipe(
        observeInZone(
          ngZone as unknown as NgZone,
          cdr as unknown as ChangeDetectorRef,
        ),
      )
      .subscribe({ complete: onComplete });

    cdr.detectChanges.mockClear();
    ngZone.run.mockClear();

    subject.complete();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(ngZone.run).toHaveBeenCalledTimes(1);
    expect(cdr.detectChanges).toHaveBeenCalledTimes(1);
  });

  it('swallows change-detection errors from a destroyed view', () => {
    cdr.detectChanges.mockImplementation(() => {
      throw new Error('view destroyed');
    });
    const received: string[] = [];

    expect(() => {
      of('a')
        .pipe(
          observeInZone(
            ngZone as unknown as NgZone,
            cdr as unknown as ChangeDetectorRef,
          ),
        )
        .subscribe(value => received.push(value));
    }).not.toThrow();

    expect(received).toEqual(['a']);
  });
});
