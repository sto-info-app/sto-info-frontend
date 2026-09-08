import {
  CustomTrackingSectionTree,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';

import {
  activeTrackingTab,
  navigateTrackingTabs,
} from './custom-tracking-tabs.utility';

describe('custom tracking tab navigation', () => {
  const section: CustomTrackingSectionTree = {
    id: 'section',
    name: 'Ships',
    targetScope: CustomTrackingTargetScope.ACCOUNT,
    description: null,
    orderIndex: 0,
    publiclyVisible: false,
    suppressed: false,
    tabs: ['first', 'second', 'third'].map((id, orderIndex) => ({
      id,
      sectionId: 'section',
      name: id,
      orderIndex,
      description: null,
      publiclyVisible: false,
      suppressed: false,
      fields: [],
    })),
  };

  it('keeps the selected tab while it remains visible', () => {
    expect(activeTrackingTab(section, { section: 'second' })).toBe(
      section.tabs[1],
    );
  });

  it.each([{}, { section: 'filtered-out' }])(
    'falls back to the first visible tab for %p',
    selections => {
      expect(activeTrackingTab(section, selections)).toBe(section.tabs[0]);
    },
  );

  it('has no active tab when the section is empty', () => {
    expect(activeTrackingTab({ ...section, tabs: [] }, {})).toBeNull();
  });

  it.each([
    ['ArrowRight', 'third', 'first'],
    ['ArrowLeft', 'first', 'third'],
    ['Home', 'second', 'first'],
    ['End', 'first', 'third'],
    ['ArrowRight', 'filtered-out', 'second'],
  ])('moves %s from %s to %s and focuses it', (key, current, expected) => {
    const selections = { section: current, other: 'untouched' };
    const focus = jest.fn();
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    navigateTrackingTabs(event, section, selections, focus);
    expect(selections).toEqual({ section: expected, other: 'untouched' });
    expect(focus).toHaveBeenCalledWith(expected);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves an unrelated key to the browser', () => {
    const selections = { section: 'second' };
    const focus = jest.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    });
    navigateTrackingTabs(event, section, selections, focus);
    expect(selections).toEqual({ section: 'second' });
    expect(focus).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores navigation when there are no tabs', () => {
    const selections = {};
    const focus = jest.fn();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      cancelable: true,
    });
    navigateTrackingTabs(event, { ...section, tabs: [] }, selections, focus);
    expect(selections).toEqual({});
    expect(focus).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
