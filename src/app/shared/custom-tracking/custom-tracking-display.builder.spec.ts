import {
  CustomTrackingEmptyMode,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingPublicSection,
  CustomTrackingRecord,
  CustomTrackingSectionTree,
  CustomTrackingStoredAnswer,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';

import {
  displayFromPublic,
  displayFromRecord,
} from './custom-tracking-display.builder';
import { aField, anAnswer, anOption } from './custom-tracking.testing';

describe('the display builder', () => {
  const aSectionTree = (
    fields = [aField()],
    overrides: Partial<CustomTrackingSectionTree> = {},
  ): CustomTrackingSectionTree => ({
    id: 'section-1',
    targetScope: CustomTrackingTargetScope.ACCOUNT,
    name: 'Fleet duties',
    description: 'What they owe the fleet',
    orderIndex: 1000,
    publiclyVisible: false,
    suppressed: false,
    tabs: [
      {
        id: 'tab-1',
        sectionId: 'section-1',
        name: 'Provisioning',
        description: null,
        orderIndex: 1000,
        publiclyVisible: false,
        suppressed: false,
        fields,
      },
    ],
    ...overrides,
  });

  const aRecord = (
    fields = [aField()],
    answers: CustomTrackingStoredAnswer[] = [],
  ): CustomTrackingRecord => ({
    target: {
      scope: CustomTrackingTargetScope.ACCOUNT,
      id: 'account-1',
      label: 'ares',
      publiclyVisible: false,
    },
    sections: [aSectionTree(fields)],
    answers,
  });

  describe('the owner’s own record', () => {
    it('folds an answer onto the field it answers', () => {
      const sections = displayFromRecord(
        aRecord(
          [aField({ ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL })],
          [anAnswer({ value: { text: 'Bellerophon' } })],
        ),
      );

      expect(sections[0].tabs[0].fields[0]).toEqual(
        expect.objectContaining({
          id: 'field-1',
          name: 'Ship name',
          value: { text: 'Bellerophon' },
          answered: true,
        }),
      );
    });

    it('applies the owner’s empty rule, not the public one', () => {
      const sections = displayFromRecord(
        aRecord([
          aField({
            ownerEmptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
            publicEmptyMode: CustomTrackingEmptyMode.HIDE,
            emptyPlaceholder: 'Not yet decided',
          }),
        ]),
      );

      expect(sections[0].tabs[0].fields[0]).toEqual(
        expect.objectContaining({
          emptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
          emptyPlaceholder: 'Not yet decided',
          answered: false,
        }),
      );
    });

    it('leaves out an unanswered field the owner asked to hide', () => {
      expect(
        displayFromRecord(
          aRecord([aField({ ownerEmptyMode: CustomTrackingEmptyMode.HIDE })]),
        ),
      ).toEqual([]);
    });

    // A heading with nothing under it is worse than no heading: it says
    // something is there and then does not show it.
    it('drops a tab and a section left with nothing in them', () => {
      const record = aRecord([
        aField({ id: 'field-1', ownerEmptyMode: CustomTrackingEmptyMode.HIDE }),
        aField({ id: 'field-2', ownerEmptyMode: CustomTrackingEmptyMode.HIDE }),
      ]);

      expect(displayFromRecord(record)).toEqual([]);
    });

    it('resolves the options an answer chose, in the order it chose them', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.MULTI_SELECT,
        options: [
          anOption({ id: 'option-1', label: 'Escort' }),
          anOption({ id: 'option-2', label: 'Cruiser' }),
        ],
      });

      const sections = displayFromRecord(
        aRecord(
          [field],
          [anAnswer({ optionIds: ['option-2', 'option-1'], value: {} })],
        ),
      );

      expect(
        sections[0].tabs[0].fields[0].chosen.map(choice => choice.label),
      ).toEqual(['Cruiser', 'Escort']);
    });

    it('skips an identifier the field no longer offers', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TAGS,
        options: [anOption({ id: 'option-1', label: 'Escort' })],
      });

      const sections = displayFromRecord(
        aRecord(
          [field],
          [anAnswer({ optionIds: ['option-1', 'option-gone'], value: {} })],
        ),
      );

      expect(sections[0].tabs[0].fields[0].chosen).toHaveLength(1);
    });

    // The answer lives outside the fragment for several types, so absence
    // cannot be read from the fragment alone.
    it('counts a picture as an answer', () => {
      const sections = displayFromRecord(
        aRecord(
          [aField({ fieldType: CustomTrackingFieldType.IMAGE })],
          [
            anAnswer({
              value: null,
              image: {
                imageId: 'image-1',
                altText: 'A ship at speed',
                shape: CustomTrackingImageShape.SQUARE,
              },
            }),
          ],
        ),
      );

      expect(sections[0].tabs[0].fields[0].answered).toBe(true);
    });
  });

  describe('what a visitor was permitted', () => {
    const aPublicSection = (
      fields: CustomTrackingPublicSection['tabs'][number]['fields'],
    ): CustomTrackingPublicSection => ({
      id: 'section-1',
      name: 'Fleet duties',
      description: null,
      tabs: [{ id: 'tab-1', name: 'Provisioning', description: null, fields }],
    });

    const aPublicField = (
      overrides: Partial<
        CustomTrackingPublicSection['tabs'][number]['fields'][number]
      > = {},
    ) => ({
      id: 'field-1',
      fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
      name: 'Ship name',
      description: null,
      configuration: {},
      emptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
      emptyPlaceholder: null,
      value: null,
      chosen: [],
      image: null,
      ...overrides,
    });

    it('takes the projection as it stands and notes what was answered', () => {
      const sections = displayFromPublic([
        aPublicSection([
          aPublicField({ id: 'field-1', value: { text: 'Bellerophon' } }),
          aPublicField({ id: 'field-2' }),
        ]),
      ]);

      expect(sections[0].tabs[0].fields[0].answered).toBe(true);
      expect(sections[0].tabs[0].fields[1].answered).toBe(false);
    });

    // The server has already applied the public empty rule, so an unanswered
    // field that arrived is one a visitor is meant to see.
    it('keeps an unanswered field the server chose to send', () => {
      const sections = displayFromPublic([
        aPublicSection([
          aPublicField({
            emptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
            emptyPlaceholder: 'Not yet decided',
          }),
        ]),
      ]);

      expect(sections[0].tabs[0].fields).toHaveLength(1);
      expect(sections[0].tabs[0].fields[0].emptyPlaceholder).toBe(
        'Not yet decided',
      );
    });

    it('counts a chosen option as an answer', () => {
      const sections = displayFromPublic([
        aPublicSection([
          aPublicField({
            fieldType: CustomTrackingFieldType.DROPDOWN,
            chosen: [{ id: 'option-1', label: 'Escort' }],
          }),
        ]),
      ]);

      expect(sections[0].tabs[0].fields[0].answered).toBe(true);
    });

    it('counts a picture as an answer', () => {
      const sections = displayFromPublic([
        aPublicSection([
          aPublicField({
            fieldType: CustomTrackingFieldType.IMAGE,
            image: {
              imageId: 'image-1',
              altText: 'A ship at speed',
              shape: CustomTrackingImageShape.SQUARE,
            },
          }),
        ]),
      ]);

      expect(sections[0].tabs[0].fields[0].answered).toBe(true);
    });

    it('has nothing to draw where nothing was permitted', () => {
      expect(displayFromPublic([])).toEqual([]);
    });
  });
});
