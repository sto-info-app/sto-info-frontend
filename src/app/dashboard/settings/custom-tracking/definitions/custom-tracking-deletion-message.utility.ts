import { ConfirmDialogData } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { CustomTrackingDeletionImpact } from 'src/app/models/custom-tracking.models';

/**
 * Escapes text that is about to be put into dialog markup.
 *
 * The name is whatever its owner typed. Angular sanitises what it renders, so
 * this is not what stands between a page and a script — it is what stops a
 * name containing a bracket from tearing the sentence around it in half.
 *
 * @param text - The text to escape.
 * @returns The same text, safe to place between tags.
 */
export function escapeForMarkup(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Counts something in words, with the right noun for the number.
 *
 * @param count - How many.
 * @param noun - What they are, singular.
 * @returns A phrase such as "1 tab" or "4 tabs".
 */
function counted(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}

/**
 * Lists what a deletion would take with it, in words.
 *
 * @param impact - What the server counted.
 * @returns A phrase, or an empty string where it would take nothing else.
 */
function describeImpact(impact: CustomTrackingDeletionImpact): string {
  const parts: string[] = [];

  if (impact.tabs > 0) {
    parts.push(counted(impact.tabs, 'tab'));
  }

  if (impact.fields > 0) {
    parts.push(counted(impact.fields, 'field'));
  }

  if (impact.values > 0) {
    parts.push(counted(impact.values, 'recorded answer'));
  }

  if (parts.length === 0) {
    return '';
  }

  const last = parts.at(-1) ?? '';

  return parts.length === 1
    ? last
    : `${parts.slice(0, -1).join(', ')} and ${last}`;
}

/**
 * What the confirmation dialog says before something is deleted.
 *
 * The counts are the point. "Delete this section" and "delete this section,
 * four tabs, nineteen fields and sixty-three recorded answers" are different
 * decisions, and only one of them is the one being made — so the server is
 * asked what would go before anybody is asked whether to let it.
 *
 * The answers are named separately from the definitions because they are the
 * part that cannot be typed again: a section can be rebuilt from memory in ten
 * minutes, and what somebody recorded against forty characters cannot.
 *
 * @param kind - What is being deleted, in prose: "section", "tab" or "field".
 * @param name - What it is called.
 * @param impact - What the server counted.
 * @returns The dialog copy.
 */
export function deletionConfirmation(
  kind: string,
  name: string,
  impact: CustomTrackingDeletionImpact,
): ConfirmDialogData {
  const going = describeImpact(impact);
  const alsoGoing =
    going === ''
      ? `<p>Nothing else goes with it — no answers have been recorded against it yet.</p>`
      : `<p>This also deletes ${going}.</p>`;

  return {
    title: `Delete ${kind}`,
    message: `
      <p>Delete the ${kind} <strong>${escapeForMarkup(name)}</strong>?</p>
      ${alsoGoing}
      <p><strong>WARNING:</strong> Deleted definitions and answers are kept for
      180 days and then removed for good. Nothing here can be undone from this
      page.</p>`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  };
}
