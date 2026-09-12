import { Provider } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

/** A stand-in for the confirmation dialog, and the answer it gives. */
export interface ConfirmPromptDouble {
  /** The dialog itself, for asserting what was asked. */
  dialog: { open: jest.Mock };

  /** Provide this to the testing module. */
  provider: Provider;

  /**
   * Sets what the reader answers next time.
   *
   * @param answer - True to agree, false to refuse, undefined to dismiss the
   *   dialog without answering.
   */
  answer(answer: boolean | undefined): void;

  /**
   * What the dialog was last asked to say.
   *
   * @returns The dialog data, or undefined when nothing was asked.
   */
  lastAsked(): { title?: string; message?: string } | undefined;
}

/**
 * Builds a confirmation dialog that agrees, unless a test says otherwise.
 *
 * Every destructive action now asks before it happens, so every spec covering
 * one has to answer. Doing that in one place keeps a dozen specs from carrying
 * a dozen copies of the same three-line dialog stub — and means a spec that
 * cares what the question said can ask, rather than reaching into a mock it
 * built itself.
 *
 * @returns The double, its provider, and the controls for both.
 */
export function stubConfirmPrompt(): ConfirmPromptDouble {
  const dialog = {
    open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }),
  };

  return {
    dialog,
    provider: { provide: MatDialog, useValue: dialog },
    answer: (answer: boolean | undefined) => {
      dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
    },
    lastAsked: () => {
      const call = dialog.open.mock.lastCall as
        [unknown, { data?: { title?: string; message?: string } }] | undefined;

      return call?.[1]?.data;
    },
  };
}
