import {
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingSectionTree,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';

import {
  countFields,
  filterDefinitions,
} from './custom-tracking-definition-filter.utility';

describe('filtering the definition hierarchy', () => {
  const field = (
    id: string,
    name: string,
    description: string | null = null,
  ): CustomTrackingField => ({
    id,
    tabId: 'tab-1',
    fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
    name,
    description,
    orderIndex: 1000,
    publiclyVisible: false,
    required: false,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: null,
    configuration: {},
    suppressed: false,
    options: [],
  });

  const sections: CustomTrackingSectionTree[] = [
    {
      id: 'section-1',
      targetScope: CustomTrackingTargetScope.ACCOUNT,
      name: 'Ship collection',
      description: 'Everything I fly.',
      orderIndex: 1000,
      publiclyVisible: false,
      suppressed: false,
      tabs: [
        {
          id: 'tab-1',
          sectionId: 'section-1',
          name: 'Cruisers',
          description: null,
          orderIndex: 1000,
          publiclyVisible: false,
          suppressed: false,
          fields: [
            field('field-1', 'Class'),
            field('field-2', 'Registry', 'The hull number.'),
          ],
        },
        {
          id: 'tab-2',
          sectionId: 'section-1',
          name: 'Escorts',
          description: null,
          orderIndex: 2000,
          publiclyVisible: false,
          suppressed: false,
          fields: [field('field-3', 'Weapons')],
        },
      ],
    },
    {
      id: 'section-2',
      targetScope: CustomTrackingTargetScope.ACCOUNT,
      name: 'Reputation',
      description: null,
      orderIndex: 2000,
      publiclyVisible: false,
      suppressed: false,
      tabs: [
        {
          id: 'tab-3',
          sectionId: 'section-2',
          name: 'Tiers',
          description: null,
          orderIndex: 1000,
          publiclyVisible: false,
          suppressed: false,
          fields: [field('field-4', 'Romulan')],
        },
      ],
    },
  ];

  const names = (result: CustomTrackingSectionTree[]): string[] =>
    result.flatMap(section => [
      section.name,
      ...section.tabs.flatMap(tab => [
        tab.name,
        ...tab.fields.map(field_ => field_.name),
      ]),
    ]);

  it('shows everything when nothing is being looked for', () => {
    expect(filterDefinitions(sections, '   ')).toBe(sections);
  });

  // Somebody searching for a section means the section, not a subset of what
  // is in it.
  it('keeps a matching section whole', () => {
    expect(names(filterDefinitions(sections, 'ship'))).toEqual([
      'Ship collection',
      'Cruisers',
      'Class',
      'Registry',
      'Escorts',
      'Weapons',
    ]);
  });

  it('matches a section on what it is for as well as its name', () => {
    expect(names(filterDefinitions(sections, 'everything i fly'))).toContain(
      'Ship collection',
    );
  });

  it('keeps a matching tab whole', () => {
    expect(names(filterDefinitions(sections, 'escorts'))).toEqual([
      'Ship collection',
      'Escorts',
      'Weapons',
    ]);
  });

  // A field found on its own with no section or tab around it says nothing
  // about where to go and change it.
  it('keeps the ancestors of a matching field', () => {
    expect(names(filterDefinitions(sections, 'registry'))).toEqual([
      'Ship collection',
      'Cruisers',
      'Registry',
    ]);
  });

  it('matches a field on its description', () => {
    expect(names(filterDefinitions(sections, 'hull number'))).toEqual([
      'Ship collection',
      'Cruisers',
      'Registry',
    ]);
  });

  it('ignores capitals', () => {
    expect(names(filterDefinitions(sections, 'ROMULAN'))).toEqual([
      'Reputation',
      'Tiers',
      'Romulan',
    ]);
  });

  it('shows nothing when nothing matches', () => {
    expect(filterDefinitions(sections, 'transwarp')).toEqual([]);
  });

  it('leaves the hierarchy it was given alone', () => {
    filterDefinitions(sections, 'registry');

    expect(sections[0].tabs).toHaveLength(2);
    expect(sections[0].tabs[0].fields).toHaveLength(2);
  });
});

describe('countFields', () => {
  it('counts nothing in an empty hierarchy', () => {
    expect(countFields([])).toBe(0);
  });

  it('counts every field in every tab of every section', () => {
    const section = (
      id: string,
      fieldCounts: number[],
    ): CustomTrackingSectionTree => ({
      id,
      targetScope: CustomTrackingTargetScope.CHARACTER,
      name: id,
      description: null,
      orderIndex: 1000,
      publiclyVisible: false,
      suppressed: false,
      tabs: fieldCounts.map((count, index) => ({
        id: `${id}-tab-${index}`,
        sectionId: id,
        name: `Tab ${index}`,
        description: null,
        orderIndex: 1000,
        publiclyVisible: false,
        suppressed: false,
        fields: Array.from({ length: count }, (_unused, fieldIndex) => ({
          id: `${id}-${index}-${fieldIndex}`,
          tabId: `${id}-tab-${index}`,
          fieldType: CustomTrackingFieldType.INTEGER,
          name: `Field ${fieldIndex}`,
          description: null,
          orderIndex: 1000,
          publiclyVisible: false,
          required: false,
          ownerEmptyMode: CustomTrackingEmptyMode.HIDE,
          publicEmptyMode: CustomTrackingEmptyMode.HIDE,
          emptyPlaceholder: null,
          configuration: {},
          suppressed: false,
          options: [],
        })),
      })),
    });

    expect(countFields([section('a', [2, 3]), section('b', [1])])).toBe(6);
  });
});
