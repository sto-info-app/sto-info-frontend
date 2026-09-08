import {
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingPublicChoice,
  CustomTrackingPublicSection,
  CustomTrackingRecord,
  CustomTrackingStoredAnswer,
} from 'src/app/models/custom-tracking.models';

import {
  CustomTrackingDisplayField,
  CustomTrackingDisplaySection,
} from './custom-tracking-display.models';

/**
 * Turning what each audience is given into the one shape a page draws.
 *
 * The public projection arrives already decided: the server has applied the
 * whole visibility chain and the public empty rule, so nothing is left to do
 * but note whether each field was answered.
 *
 * The owner's record arrives whole, because the owner is entitled to all of
 * it, so the owner's own empty rule is applied here. That asymmetry is the
 * point rather than an oversight — a rule about what a stranger may see cannot
 * be applied in a stranger's browser, and a rule about how somebody prefers
 * their own page to look has no reason to be applied anywhere else.
 */

/**
 * Builds the display model from what a visitor was permitted.
 *
 * @param sections - The permitted projection.
 * @returns The sections to draw.
 */
export function displayFromPublic(
  sections: CustomTrackingPublicSection[],
): CustomTrackingDisplaySection[] {
  return sections.map(section => ({
    id: section.id,
    name: section.name,
    description: section.description,
    tabs: section.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      description: tab.description,
      fields: tab.fields.map(field => ({
        ...field,
        answered: isAnswered(field.value, field.chosen.length, field.image),
      })),
    })),
  }));
}

/**
 * Builds the display model from the owner's own record.
 *
 * @param record - The record as its owner is sent it.
 * @returns The sections to draw, with the owner's empty rule applied.
 */
export function displayFromRecord(
  record: CustomTrackingRecord,
): CustomTrackingDisplaySection[] {
  const answers = new Map(
    record.answers.map(answer => [answer.fieldId, answer] as const),
  );

  return record.sections
    .map(section => ({
      id: section.id,
      name: section.name,
      description: section.description,
      tabs: section.tabs
        .map(tab => ({
          id: tab.id,
          name: tab.name,
          description: tab.description,
          fields: tab.fields
            .map(field => ownerField(field, answers.get(field.id) ?? null))
            .filter(
              (field): field is CustomTrackingDisplayField => field !== null,
            ),
        }))
        .filter(tab => tab.fields.length > 0),
    }))
    .filter(section => section.tabs.length > 0);
}

/**
 * Folds one of the owner's fields together with what answers it.
 *
 * @param field - The field, as its owner has it.
 * @param answer - What is recorded against it, or null.
 * @returns The field to draw, or null where the owner asked to hide it.
 */
function ownerField(
  field: CustomTrackingField,
  answer: CustomTrackingStoredAnswer | null,
): CustomTrackingDisplayField | null {
  const chosen = answer ? chosenOf(field, answer.optionIds) : [];
  const answered = answer !== null;

  if (!answered && field.ownerEmptyMode === CustomTrackingEmptyMode.HIDE) {
    return null;
  }

  return {
    id: field.id,
    fieldType: field.fieldType,
    name: field.name,
    description: field.description,
    configuration: field.configuration,
    emptyMode: field.ownerEmptyMode,
    emptyPlaceholder: field.emptyPlaceholder,
    value: answer?.value ?? null,
    chosen,
    image: answer?.image ?? null,
    answered,
  };
}

/**
 * Resolves the options an answer chose, in the order it chose them.
 *
 * Withdrawn options resolve like any other. The value said this, and its owner
 * having since retired the word does not change what they said.
 *
 * @param field - The field answered.
 * @param optionIds - The identifiers the answer holds.
 * @returns The chosen options.
 */
function chosenOf(
  field: CustomTrackingField,
  optionIds: string[],
): CustomTrackingPublicChoice[] {
  const byId = new Map(
    field.options.map(option => [option.id, option] as const),
  );

  return optionIds
    .map(optionId => byId.get(optionId))
    .filter(option => option !== undefined)
    .map(option => ({ id: option.id, label: option.label }));
}

/**
 * Determines whether a permitted field carries an answer.
 *
 * The three places an answer can live are checked separately: the typed
 * fragment, the options chosen, and the picture. A field answered only by a
 * chosen option or only by a picture has no fragment at all, and reading
 * absence from the fragment alone would call it unanswered.
 *
 * @param value - The typed fragment, if there is one.
 * @param chosenCount - How many options were chosen.
 * @param image - The picture, if there is one.
 * @returns True when something is recorded.
 */
function isAnswered(
  value: Record<string, unknown> | null,
  chosenCount: number,
  image: unknown,
): boolean {
  return value !== null || chosenCount > 0 || image !== null;
}
