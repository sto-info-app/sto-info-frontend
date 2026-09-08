import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ManagedActionRunner } from './managed-action.runner';

/**
 * A list of the kind the runner exists for.
 *
 * A real component rather than a bare object, because the runner takes the
 * component's own destroy, zone and change-detection references and there is
 * nowhere else a `ChangeDetectorRef` can come from.
 */
@Component({
  selector: 'app-managed-action-host',
  standalone: true,
  template: '<p>{{ errorMessage }}</p>',
})
class ManagedActionHostComponent {
  isLoading = false;
  errorMessage = '';
  reloads = 0;

  readonly runner = new ManagedActionRunner(this, () => {
    this.reloads++;
    this.isLoading = false;
  });

  readonly deleting = new ManagedActionRunner(
    this,
    () => this.reloads++,
    'That section could not be deleted.',
  );

  // A saver whose action answers with the new state has nothing to re-read.
  readonly saving = new ManagedActionRunner(this, undefined, 'Not saved.');

  saved = '';
}

describe('ManagedActionRunner', () => {
  let fixture: ComponentFixture<ManagedActionHostComponent>;
  let host: ManagedActionHostComponent;

  const failing = (body: unknown): Observable<never> =>
    throwError(
      () => new HttpErrorResponse({ status: 400, error: body, url: '/test' }),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagedActionHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagedActionHostComponent);
    host = fixture.componentInstance;
  });

  it('reloads once the server has accepted, because the server settles the result', () => {
    host.runner.run(of(undefined));

    expect(host.reloads).toBe(1);
    expect(host.errorMessage).toBe('');
  });

  it('runs anything else asked of it before reloading', () => {
    const order: string[] = [];

    host.runner.run(of(undefined), () => order.push('after'));

    expect(order).toEqual(['after']);
    expect(host.reloads).toBe(1);
  });

  it('clears the last complaint before starting', () => {
    host.errorMessage = 'Something earlier went wrong.';

    host.runner.run(of(undefined));

    expect(host.errorMessage).toBe('');
  });

  // The server names the specific problem, which is more use to a reader than
  // a generic apology.
  it('reports what the server said', () => {
    host.runner.run(failing({ message: 'That name is already used.' }));

    expect(host.errorMessage).toBe('That name is already used.');
    expect(host.isLoading).toBe(false);
    expect(host.reloads).toBe(0);
  });

  // A form that got several properties wrong is refused with one complaint per
  // property, and a reader needs all of them rather than whichever came first.
  it('reports every complaint when the server sends a list', () => {
    host.runner.run(
      failing({
        message: [
          'The smallest value must be below the largest.',
          'Decimal places must be a whole number.',
        ],
      }),
    );

    expect(host.errorMessage).toBe(
      'The smallest value must be below the largest. Decimal places must be a whole number.',
    );
  });

  it('falls back to its own wording when the server explains nothing', () => {
    host.runner.run(failing(null));

    expect(host.errorMessage).toBe(
      'That change could not be saved. Please try again shortly.',
    );
  });

  it('uses the wording it was given for a failure', () => {
    host.deleting.run(failing(null));

    expect(host.errorMessage).toBe('That section could not be deleted.');
  });

  // An action that answers with the new state settles the host itself. Asking
  // the server for it again would be a second request for something already
  // in hand.
  it('re-reads nothing where the caller asked for no reload', () => {
    host.saving.run(of('the saved record'), saved => {
      host.saved = saved;
      host.isLoading = false;
    });

    expect(host.saved).toBe('the saved record');
    expect(host.reloads).toBe(0);
    expect(host.isLoading).toBe(false);
  });
});
